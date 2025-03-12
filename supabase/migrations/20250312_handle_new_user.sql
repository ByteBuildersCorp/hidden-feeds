
-- Update the handle_new_user function to handle duplicate usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE 
  username_attempt text;
  counter integer := 0;
BEGIN
  -- Initial username from metadata
  username_attempt := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  
  -- Keep trying with incremental numbers until we find a unique username
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = username_attempt) LOOP
    counter := counter + 1;
    username_attempt := username_attempt || counter::text;
  END LOOP;
  
  -- Insert the profile with the unique username
  INSERT INTO public.profiles (
    id,
    username,
    email,
    name
  ) VALUES (
    new.id,
    username_attempt,
    new.email,
    new.raw_user_meta_data->>'username'
  );
  
  RETURN new;
END;
$$;
