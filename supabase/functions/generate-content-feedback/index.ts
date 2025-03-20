
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { content, type } = await req.json()
    
    if (!content || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content and type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Generating ${type} feedback for content: ${content.substring(0, 50)}...`)
    
    // Call Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: type === 'poll' 
              ? `Please review this poll question and provide suggestions to make it more engaging and effective. Keep your feedback concise, positive, and actionable: "${content}"`
              : `Please review this social media post and provide suggestions to make it more engaging and effective. Keep your feedback concise, positive, and actionable: "${content}"`
          }]
        }]
      }),
    })
    
    const data = await response.json()
    console.log('Gemini API response:', JSON.stringify(data))
    
    // Check for errors in Gemini response
    if (data.error) {
      console.error('Gemini API error:', data.error)
      throw new Error(`Gemini API error: ${data.error.message || 'Unknown error'}`)
    }
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error('Unexpected Gemini API response format:', data)
      throw new Error('Unexpected response format from Gemini API')
    }
    
    // Extract feedback from Gemini's response
    const feedback = data.candidates[0].content.parts[0].text
    console.log('Generated feedback:', feedback)

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate feedback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
