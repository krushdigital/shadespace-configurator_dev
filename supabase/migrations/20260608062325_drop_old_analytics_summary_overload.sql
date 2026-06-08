/*
  Drop the stale 4-parameter overload of get_analytics_summary.
  
  Two signatures existed:
    1. (timestamptz, timestamptz, boolean, text) — old, all params have defaults
    2. (timestamptz, timestamptz, boolean, text, text) — current, has p_timezone
  
  PostgREST cannot disambiguate when the caller passes 3 args,
  causing HTTP 300 and "failed to load analytics" in the admin dashboard.
*/
DROP FUNCTION IF EXISTS get_analytics_summary(timestamptz, timestamptz, boolean, text);
