/*
  # Backfill out-of-bounds current_step values

  Some saved quotes (notably staff-created admin_quote_builder quotes) were stored
  with current_step = 7, which is outside the valid 0-6 step range. The configurator
  interprets current_step as a 0-based index, so 7 matched no accordion and left the
  Review & Purchase tab (index 6) unopened with no diagram or price column.

  This clamps those rows to the Review & Purchase step (6) so existing shared links
  open correctly.
*/

UPDATE saved_quotes
SET current_step = 6
WHERE current_step = 7;
