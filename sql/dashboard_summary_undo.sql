-- ============================================================
-- UNDO SCRIPT FOR dashboard_summary RPC
-- Reverts dashboard_summary.sql to the previous baseline version.
-- ============================================================

-- 1) Recreate function to previous behavior
DROP FUNCTION IF EXISTS public.dashboard_summary(date, date, date, date, date, date, text);

CREATE OR REPLACE FUNCTION public.dashboard_summary(
  p_start        date,
  p_end          date,
  p_prev_start   date,
  p_prev_end     date,
  p_chart_start  date,
  p_chart_end    date,
  p_bucket       text DEFAULT 'month'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  v_total_leads     bigint;
  v_kpis            jsonb;
  v_newest          jsonb;
  v_captured_by     jsonb;
  v_top_services    jsonb;
  v_overall_series  jsonb;
  v_lead_source     jsonb;
  v_lead_in         jsonb;
  v_closed_won      jsonb;
  v_closed_lost     jsonb;
  v_range_start     date;
  v_range_end       date;
BEGIN
  v_range_start := LEAST(p_start, p_prev_start);
  v_range_end   := GREATEST(p_end, p_prev_end);

  SELECT count(*) INTO v_total_leads FROM crm_leads;

  SELECT jsonb_build_object(
    'totalLeads',      v_total_leads,
    'leadsThisPeriod', count(*) FILTER (
      WHERE first_contact >= p_start AND first_contact < p_end),
    'leadsLastPeriod', count(*) FILTER (
      WHERE first_contact >= p_prev_start AND first_contact < p_prev_end),
    'won', count(*) FILTER (
      WHERE lower(status) IN ('closed win','closed won')
        AND first_contact >= p_start AND first_contact < p_end),
    'wonPrev', count(*) FILTER (
      WHERE lower(status) IN ('closed win','closed won')
        AND first_contact >= p_prev_start AND first_contact < p_prev_end),
    'lost', count(*) FILTER (
      WHERE lower(status) = 'closed lost'
        AND first_contact >= p_start AND first_contact < p_end),
    'lostPrev', count(*) FILTER (
      WHERE lower(status) = 'closed lost'
        AND first_contact >= p_prev_start AND first_contact < p_prev_end),
    'inProgress', count(*) FILTER (
      WHERE (lower(status) LIKE '%in progress%' OR lower(status) LIKE '%lead in%')
        AND first_contact >= p_start AND first_contact < p_end),
    'inProgressPrev', count(*) FILTER (
      WHERE (lower(status) LIKE '%in progress%' OR lower(status) LIKE '%lead in%')
        AND first_contact >= p_prev_start AND first_contact < p_prev_end),
    'wonRevenue', COALESCE(sum(service_price) FILTER (
      WHERE lower(status) IN ('closed win','closed won')
        AND first_contact >= p_start AND first_contact < p_end), 0)
  )
  INTO v_kpis
  FROM crm_leads
  WHERE first_contact >= v_range_start AND first_contact < v_range_end;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'captured_by',  captured_by,
      'contact_name', contact_name,
      'status',       status,
      'created_at',   first_contact
    ))
    FROM (
      SELECT captured_by, contact_name, status, first_contact
      FROM crm_leads
      ORDER BY first_contact DESC NULLS LAST
      LIMIT 4
    ) sub
  ), '[]'::jsonb) INTO v_newest;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object('name', name, 'value', value))
    FROM (
      SELECT btrim(captured_by) AS name, count(*)::int AS value
      FROM crm_leads
      WHERE captured_by IS NOT NULL
        AND first_contact >= p_start AND first_contact < p_end
      GROUP BY btrim(captured_by)
      ORDER BY value DESC
      LIMIT 12
    ) sub
  ), '[]'::jsonb) INTO v_captured_by;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'service_product', service_product, 'count', count))
    FROM (
      SELECT upper(btrim(service_product)) AS service_product,
             count(*)::int AS count
      FROM crm_leads
      WHERE service_product IS NOT NULL
        AND first_contact >= p_start AND first_contact < p_end
      GROUP BY upper(btrim(service_product))
      ORDER BY count DESC
      LIMIT 20
    ) sub
  ), '[]'::jsonb) INTO v_top_services;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'label', label, 'total_leads', total_leads))
    FROM (
      SELECT
        CASE p_bucket
          WHEN 'day'     THEN lpad(extract(day FROM first_contact)::int::text, 2, '0')
          WHEN 'week'    THEN 'W' || ceil(extract(doy FROM first_contact)/7.0)::int::text
          WHEN 'month'   THEN to_char(first_contact, 'Mon')
          WHEN 'quarter' THEN 'Q' || extract(quarter FROM first_contact)::int::text
          WHEN 'year'    THEN extract(year FROM first_contact)::int::text
        END AS label,
        CASE p_bucket
          WHEN 'day'     THEN extract(day FROM first_contact)
          WHEN 'week'    THEN ceil(extract(doy FROM first_contact)/7.0)
          WHEN 'month'   THEN extract(month FROM first_contact)
          WHEN 'quarter' THEN extract(quarter FROM first_contact)
          WHEN 'year'    THEN extract(year FROM first_contact)
        END AS sk,
        count(*)::int AS total_leads
      FROM crm_leads
      WHERE first_contact >= p_chart_start AND first_contact < p_chart_end
      GROUP BY 1, 2
      ORDER BY sk
    ) sub
  ), '[]'::jsonb) INTO v_overall_series;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'label', label, 'source', source, 'count', count))
    FROM (
      SELECT
        CASE p_bucket
          WHEN 'day'     THEN lpad(extract(day FROM first_contact)::int::text, 2, '0')
          WHEN 'week'    THEN 'W' || ceil(extract(doy FROM first_contact)/7.0)::int::text
          WHEN 'month'   THEN to_char(first_contact, 'Mon')
          WHEN 'quarter' THEN 'Q' || extract(quarter FROM first_contact)::int::text
          WHEN 'year'    THEN extract(year FROM first_contact)::int::text
        END AS label,
        CASE p_bucket
          WHEN 'day'     THEN extract(day FROM first_contact)
          WHEN 'week'    THEN ceil(extract(doy FROM first_contact)/7.0)
          WHEN 'month'   THEN extract(month FROM first_contact)
          WHEN 'quarter' THEN extract(quarter FROM first_contact)
          WHEN 'year'    THEN extract(year FROM first_contact)
        END AS sk,
        COALESCE(btrim(lead_source), 'Unknown') AS source,
        count(*)::int AS count
      FROM crm_leads
      WHERE first_contact >= p_chart_start AND first_contact < p_chart_end
      GROUP BY 1, 2, 3
      ORDER BY sk, source
    ) sub
  ), '[]'::jsonb) INTO v_lead_source;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'name', coalesce(contact_name,'Unnamed'),
      'captured_by', coalesce(captured_by,''),
      'created_at',  coalesce(first_contact::text,'')))
    FROM (
      SELECT contact_name, captured_by, first_contact
      FROM crm_leads
      WHERE (lower(status) LIKE '%in progress%'
          OR lower(status) LIKE '%lead in%')
        AND first_contact >= p_start AND first_contact < p_end
      ORDER BY first_contact DESC
    ) sub
  ), '[]'::jsonb) INTO v_lead_in;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'name', coalesce(contact_name,'Unnamed'),
      'captured_by', coalesce(captured_by,''),
      'created_at',  coalesce(first_contact::text,'')))
    FROM (
      SELECT contact_name, captured_by, first_contact
      FROM crm_leads
      WHERE lower(status) IN ('closed win','closed won')
        AND first_contact >= p_start AND first_contact < p_end
      ORDER BY first_contact DESC
    ) sub
  ), '[]'::jsonb) INTO v_closed_won;

  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'name', coalesce(contact_name,'Unnamed'),
      'captured_by', coalesce(captured_by,''),
      'created_at',  coalesce(first_contact::text,'')))
    FROM (
      SELECT contact_name, captured_by, first_contact
      FROM crm_leads
      WHERE lower(status) = 'closed lost'
        AND first_contact >= p_start AND first_contact < p_end
      ORDER BY first_contact DESC
    ) sub
  ), '[]'::jsonb) INTO v_closed_lost;

  RETURN jsonb_build_object(
    'kpis',             v_kpis,
    'newest',           v_newest,
    'capturedBy',       v_captured_by,
    'topServices',      v_top_services,
    'overallSeries',    v_overall_series,
    'leadSourceSeries', v_lead_source,
    'leadInLeads',      v_lead_in,
    'closedWonLeads',   v_closed_won,
    'closedLostLeads',  v_closed_lost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_summary TO authenticated;

-- 2) Keep old index set and remove created_at index introduced by newer script
CREATE INDEX IF NOT EXISTS idx_crm_leads_first_contact
  ON crm_leads (first_contact);

CREATE INDEX IF NOT EXISTS idx_crm_leads_status_first_contact
  ON crm_leads (lower(status), first_contact);

CREATE INDEX IF NOT EXISTS idx_crm_leads_first_contact_desc
  ON crm_leads (first_contact DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_crm_leads_captured_by_first_contact
  ON crm_leads (captured_by, first_contact)
  WHERE captured_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_service_product_first_contact
  ON crm_leads (service_product, first_contact)
  WHERE service_product IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_source_first_contact
  ON crm_leads (lead_source, first_contact);

DROP INDEX IF EXISTS idx_crm_leads_created_at_desc;
