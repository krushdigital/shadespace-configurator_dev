/*
  # Persistent shade sail diagrams accessible for email and preview

  1. Changes
    - Added `diagram_public_url` (text) column on saved_quotes for the hosted image URL
      used both by the PDF Quote email and the admin "Preview with a real quote" feature.
    - Marked the `quote-assets` storage bucket as public so diagram image URLs generated
      by `getPublicUrl()` can be loaded by email clients and the admin preview iframe.
    - Added a permissive public-read RLS policy on `storage.objects` scoped to the
      `quote-assets` bucket so anonymous readers can fetch diagrams served via email.
    - Backfilled `diagram_public_url` from the most recent `email_pdf_quote` user_event
      whose `event_data.canvas_image` is a plain URL (skips any stale base64 data URIs).

  2. Security
    - Only SELECT is granted to anon/authenticated on the bucket; write access still
      requires the service_role (unchanged existing policy).
    - PDF files and other sensitive assets in this bucket should already be placed in
      unguessable paths; keep that convention for any new writes.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'diagram_public_url'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN diagram_public_url text;
  END IF;
END $$;

UPDATE storage.buckets SET public = true WHERE id = 'quote-assets';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'quote-assets public read'
  ) THEN
    EXECUTE 'CREATE POLICY "quote-assets public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = ''quote-assets'')';
  END IF;
END $$;

WITH latest_events AS (
  SELECT DISTINCT ON (customer_email)
    customer_email,
    event_data ->> 'canvas_image' AS canvas_image,
    event_data ->> 'quoteReference' AS quote_reference,
    created_at
  FROM user_events
  WHERE event_type = 'email_pdf_quote'
    AND event_data ? 'canvas_image'
    AND (event_data ->> 'canvas_image') LIKE 'http%'
  ORDER BY customer_email, created_at DESC
)
UPDATE saved_quotes sq
SET diagram_public_url = le.canvas_image
FROM latest_events le
WHERE sq.customer_email = le.customer_email
  AND sq.diagram_public_url IS NULL
  AND le.canvas_image IS NOT NULL;
