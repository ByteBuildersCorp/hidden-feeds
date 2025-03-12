
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
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: type === 'poll' 
              ? 'You are a helpful assistant that provides constructive feedback on poll questions. Keep your feedback concise, positive, and actionable.'
              : 'You are a helpful assistant that provides constructive feedback on social media posts. Keep your feedback concise, positive, and actionable.'
          },
          {
            role: 'user',
            content: type === 'poll'
              ? `Please review this poll question and provide suggestions to make it more engaging: "${content}"`
              : `Please review this post and provide suggestions to make it more engaging: "${content}"`
          }
        ],
      }),
    })

    const data = await response.json()
    const feedback = data.choices[0].message.content

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate feedback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
