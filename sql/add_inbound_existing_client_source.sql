INSERT INTO public.lead_sources (name)
SELECT 'Inbound - Existing Client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources WHERE name = 'Inbound - Existing Client'
);
