-- Allow anonymous users to upload images to the quote-assets bucket
-- This enables the configurator to store permanent diagram/3D screenshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'quote-assets anon insert'
  ) THEN
    EXECUTE 'CREATE POLICY "quote-assets anon insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = ''quote-assets'')';
  END IF;
END $$;
