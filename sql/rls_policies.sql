-- ============================================================
-- RLS policies for Petrosphere CRM
-- Run in Supabase SQL Editor if lead-table / direct table reads fail
-- while dashboard RPC still works (RPC uses SECURITY DEFINER).
-- ============================================================

-- Helper: true when the signed-in user is an admin
CREATE OR REPLACE FUNCTION public.is_crm_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- ── profiles ────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_crm_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_crm_admin());

-- ── crm_leads ───────────────────────────────────────────────
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_leads_admin_all" ON public.crm_leads;
CREATE POLICY "crm_leads_admin_all"
  ON public.crm_leads FOR ALL
  TO authenticated
  USING (public.is_crm_admin())
  WITH CHECK (public.is_crm_admin());

-- ── lead_history ────────────────────────────────────────────
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_history_admin_all" ON public.lead_history;
CREATE POLICY "lead_history_admin_all"
  ON public.lead_history FOR ALL
  TO authenticated
  USING (public.is_crm_admin())
  WITH CHECK (public.is_crm_admin());

-- ── lookup / settings tables (read for admins) ──────────────
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_by_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regions_admin_all" ON public.regions;
CREATE POLICY "regions_admin_all"
  ON public.regions FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS "lead_sources_admin_all" ON public.lead_sources;
CREATE POLICY "lead_sources_admin_all"
  ON public.lead_sources FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS "lead_statuses_admin_all" ON public.lead_statuses;
CREATE POLICY "lead_statuses_admin_all"
  ON public.lead_statuses FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS "services_admin_all" ON public.services;
CREATE POLICY "services_admin_all"
  ON public.services FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS "captured_by_settings_admin_all" ON public.captured_by_settings;
CREATE POLICY "captured_by_settings_admin_all"
  ON public.captured_by_settings FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

-- ── other trackers (optional — enable if you use these pages) ─
ALTER TABLE public.proposals_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdn_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_tracker_admin_all" ON public.proposals_tracker;
CREATE POLICY "proposals_tracker_admin_all"
  ON public.proposals_tracker FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS "webinar_tracker_admin_all" ON public.webinar_tracker;
CREATE POLICY "webinar_tracker_admin_all"
  ON public.webinar_tracker FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS "social_media_tracker_admin_all" ON public.social_media_tracker;
CREATE POLICY "social_media_tracker_admin_all"
  ON public.social_media_tracker FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());

DROP POLICY IF EXISTS "pdn_leads_admin_all" ON public.pdn_leads;
CREATE POLICY "pdn_leads_admin_all"
  ON public.pdn_leads FOR ALL TO authenticated
  USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());
