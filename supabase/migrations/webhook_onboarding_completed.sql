-- Run in Supabase SQL Editor
-- Sets up a webhook to n8n when a client's onboarding_status is marked as 'Completed'

-- 1. Enable pg_net extension (required for http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the handler function
CREATE OR REPLACE FUNCTION public.handle_onboarding_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if onboarding_status in section_m changed to 'Completed'
  -- Note: onboarding_status is stored inside the section_m JSONB column
  IF (NEW.section_m->>'onboarding_status' = 'Completed') AND 
     (OLD.section_m IS NULL OR OLD.section_m->>'onboarding_status' IS DISTINCT FROM 'Completed') THEN
    
    PERFORM
      net.http_post(
        url := 'https://n8n.emozidigital.com/webhook/2059d5c3-1150-4fd4-bdf5-4c33eaf29297',
        body := jsonb_build_object(
          'event', 'onboarding_completed',
          'clientId', NEW.id,
          'clientName', NEW.legal_name,
          'clientEmail', NEW.email,
          'onboarding_status', 'Completed',
          'timestamp', now()
        )::text,
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_onboarding_completed ON public.clients;
CREATE TRIGGER on_onboarding_completed
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_onboarding_completed();
