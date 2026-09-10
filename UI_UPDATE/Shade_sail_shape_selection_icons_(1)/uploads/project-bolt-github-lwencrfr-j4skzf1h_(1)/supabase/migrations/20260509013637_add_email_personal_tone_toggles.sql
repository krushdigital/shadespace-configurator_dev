/*
  # Email personal-tone toggles and reusable signatures

  1. Schema changes
    - `email_templates` gains:
      - `include_header` boolean default true. When false, strips the dark hero banner on send/preview.
      - `include_signature` boolean default false. When true, appends the sender's signature HTML.
    - `email_senders` gains:
      - `signature_html` text. Reusable signature HTML (paste-from-Codetwo). Shared by every template that opts in.

  2. Data changes
    - Marketing/customisable templates (non-transactional) get their hero banner wrapped with
      `<!-- HEADER_BANNER_START --> ... <!-- HEADER_BANNER_END -->` markers so the send-email
      function can strip them when `include_header=false`.
    - Transactional templates (quote emails, PDF delivery) are NOT modified and NOT exposed in the
      new toggle UI — they must always keep their branded design.

  3. Safety
    - Defaults preserve existing behavior.
    - All statements guarded with IF NOT EXISTS / conditional checks.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_templates' AND column_name='include_header') THEN
    ALTER TABLE email_templates ADD COLUMN include_header boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_templates' AND column_name='include_signature') THEN
    ALTER TABLE email_templates ADD COLUMN include_signature boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_senders' AND column_name='signature_html') THEN
    ALTER TABLE email_senders ADD COLUMN signature_html text;
  END IF;
END $$;

-- Wrap the single hero banner <tr>...</tr> with markers for non-transactional step templates.
-- The banner <tr> always starts with: <tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff"
UPDATE email_templates
SET html_body = regexp_replace(
  html_body,
  '(<tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff[^<]*(?:<[^/][^>]*>[^<]*)*?</td></tr>)',
  '<!-- HEADER_BANNER_START -->\1<!-- HEADER_BANNER_END -->',
  'g'
)
WHERE transactional = false
  AND html_body LIKE '%background:#0f3d2e;color:#fff%'
  AND html_body NOT LIKE '%HEADER_BANNER_START%';
