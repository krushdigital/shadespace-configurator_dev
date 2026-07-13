/*
# Exempt staff quote-builder quotes from the internal-traffic exclusion system

Staff members create quotes through the admin dashboard's Quote Builder while on
an internal/office IP address. The exclusion system was auto-flagging those
quotes as internal traffic, so they disappeared from Saved Quotes and analytics
whenever the "Exclude Internal" toggle was on. Quotes created by staff via the
Quote Builder should always remain visible and counted.

1. Modified functions
   - `check_exclusion_on_quote` (BEFORE INSERT trigger): when the new quote's
     `created_via` is `admin_quote_builder`, force `is_excluded = false` and
     return early, so staff quotes are never auto-excluded even from an internal
     IP or matching email. All other quotes keep the existing IP-range and email
     matching behavior.
   - `refresh_exclusion_flags` (bulk re-flag routine): never re-flags
     `admin_quote_builder` quotes when exclusion lists change, so they stay
     visible. `user_events` re-flagging is unchanged.

2. Data backfill
   - Sets `is_excluded = false` for existing `admin_quote_builder` quotes that
     were previously flagged, so they immediately reappear in Saved Quotes and
     count in analytics with "Exclude Internal" enabled.

3. Notes
   1. No schema/columns are dropped or altered; only function bodies and a
      targeted data update.
   2. Customer-created quotes are unaffected and continue to be excluded by IP
      and email as before.
*/

CREATE OR REPLACE FUNCTION public.check_exclusion_on_quote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
clean_ip text;
BEGIN
-- Staff quotes built via the admin Quote Builder are never internal traffic.
IF NEW.created_via = 'admin_quote_builder' THEN
NEW.is_excluded := false;
RETURN NEW;
END IF;

clean_ip := trim(split_part(COALESCE(NEW.customer_ip, ''), ',', 1));

IF is_ip_excluded(clean_ip) THEN
NEW.is_excluded := true;
RETURN NEW;
END IF;

IF NEW.customer_email IS NOT NULL THEN
IF EXISTS (
SELECT 1 FROM excluded_emails
WHERE NEW.customer_email ILIKE email_pattern
OR NEW.customer_email ILIKE '%' || email_pattern
) THEN
NEW.is_excluded := true;
RETURN NEW;
END IF;
END IF;

RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_exclusion_flags()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
events_updated integer := 0;
quotes_updated integer := 0;
BEGIN
UPDATE user_events SET is_excluded = false WHERE is_excluded = true;
UPDATE saved_quotes SET is_excluded = false WHERE is_excluded = true;

UPDATE user_events
SET is_excluded = true
WHERE is_ip_excluded(trim(split_part(COALESCE(customer_ip, ''), ',', 1)));
GET DIAGNOSTICS events_updated = ROW_COUNT;

UPDATE saved_quotes
SET is_excluded = true
WHERE created_via IS DISTINCT FROM 'admin_quote_builder'
AND is_ip_excluded(trim(split_part(COALESCE(customer_ip, ''), ',', 1)));
GET DIAGNOSTICS quotes_updated = ROW_COUNT;

UPDATE user_events ue SET is_excluded = true
WHERE ue.is_excluded = false
AND ue.customer_email IS NOT NULL
AND EXISTS (
SELECT 1 FROM excluded_emails ee
WHERE ue.customer_email ILIKE ee.email_pattern
OR ue.customer_email ILIKE '%' || ee.email_pattern
);

UPDATE saved_quotes sq SET is_excluded = true
WHERE sq.is_excluded = false
AND sq.created_via IS DISTINCT FROM 'admin_quote_builder'
AND sq.customer_email IS NOT NULL
AND EXISTS (
SELECT 1 FROM excluded_emails ee
WHERE sq.customer_email ILIKE ee.email_pattern
OR sq.customer_email ILIKE '%' || ee.email_pattern
);

RETURN jsonb_build_object(
'events_flagged', events_updated,
'quotes_flagged', quotes_updated
);
END;
$function$;

UPDATE saved_quotes
SET is_excluded = false
WHERE created_via = 'admin_quote_builder'
AND is_excluded = true;
