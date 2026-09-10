/*
  # Transactional Email Studio Integration

  1. Schema
    - email_templates: add `transactional` + `subject_locked` flags
    - email_queue: add `attachments` jsonb column for file metadata
    - saved_quotes: add `diagram_image_path` + `pdf_path` for cached assets
    - email_pipeline_config: add `use_studio_transactional` feature flag

  2. Storage
    - quote-assets bucket for persisted PDFs and diagram PNGs (service-role only)

  3. Seeded Templates
    - `configuration_saved` (save progress email)
    - `pdf_quote_delivery` (full quote + PDF attachment email)
    Both marked transactional + subject_locked with exact subjects:
      - "Your ShadeSpace Progress Has Been Saved - {{quote_reference}}"
      - "Your ShadeSpace Quote - {{quote_reference}}"

  4. Security
    - All tables already have RLS; no policy changes required
    - Storage policies: service role only (edge functions operate with service key)
*/

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS transactional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subject_locked boolean NOT NULL DEFAULT false;

ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE saved_quotes
  ADD COLUMN IF NOT EXISTS diagram_image_path text,
  ADD COLUMN IF NOT EXISTS pdf_path text;

ALTER TABLE email_pipeline_config
  ADD COLUMN IF NOT EXISTS use_studio_transactional boolean NOT NULL DEFAULT true;

-- Storage bucket for PDFs and diagrams
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-assets', 'quote-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Service role reads/writes only; no public policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'quote-assets service role all') THEN
    CREATE POLICY "quote-assets service role all" ON storage.objects
      FOR ALL TO service_role USING (bucket_id = 'quote-assets') WITH CHECK (bucket_id = 'quote-assets');
  END IF;
END $$;

-- Seed default sender if missing
INSERT INTO email_senders (label, from_name, from_email, reply_to, signature_name, is_default, is_verified)
SELECT 'ShadeSpace Default', 'ShadeSpace', 'hello@shadespace.com', 'sails@shadespace.com', 'the ShadeSpace team', true, false
WHERE NOT EXISTS (SELECT 1 FROM email_senders WHERE from_email = 'hello@shadespace.com');

-- Helper: find sender for templates
DO $$
DECLARE
  sender_uuid uuid;
  save_html text;
  pdf_html text;
BEGIN
  SELECT id INTO sender_uuid FROM email_senders ORDER BY is_default DESC NULLS LAST, created_at ASC LIMIT 1;

  save_html := $SAVE$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ShadeSpace Progress Has Been Saved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0;">
    <tr>
      <td style="background-color: #01312D; padding: 24px 20px; text-align: center;">
        <img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-white_3x_db41a610-bfc6-4f61-bb82-b95e27cd58d8.png?v=1728339549" alt="ShadeSpace" style="height: 40px; width: auto;" />
      </td>
    </tr>
    <tr>
      <td style="background-color: #307C31; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Your Configuration Has Been Saved!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 30px 15px 30px;">
        <p style="color: #01312D; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Hello {{customer_name}},</p>
        <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.7;">
          Thank you for saving your custom shade sail configuration with ShadeSpace. Your configuration has been saved and you can continue where you left off anytime using the link below.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <div style="border: 2px solid #BFF102; border-radius: 10px; padding: 24px; text-align: center; background-color: #FAFFF0;">
          <div style="color: #64748B; font-size: 12px; margin-bottom: 4px;">Configuration Name</div>
          <div style="color: #01312D; font-size: 18px; font-weight: bold; margin-bottom: 16px;">{{quote_name}}</div>
          <div style="color: #01312D; font-size: 14px; font-weight: bold; margin-bottom: 4px;">Quote Reference</div>
          <div style="color: #307C31; font-size: 22px; font-weight: bold; font-family: 'Courier New', monospace; margin-bottom: 16px;">{{quote_reference}}</div>
          <div style="color: #64748B; font-size: 12px; margin-bottom: 4px;">Valid Until</div>
          <div style="color: #01312D; font-size: 16px; font-weight: bold;">{{pricing_locked_until}}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 15px 30px; text-align: center;">
        <a href="{{resume_url}}" style="display: inline-block; background-color: #BFF102; color: #01312D; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: bold;">Access Your Configuration</a>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 25px 30px; text-align: center;">
        <p style="color: #64748B; font-size: 12px; margin: 0 0 4px 0;">Or copy this link:</p>
        <p style="color: #307C31; font-size: 11px; margin: 0; word-break: break-all; font-family: 'Courier New', monospace;">{{resume_url}}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 25px 30px;">
        <div style="border-left: 4px solid #f59e0b; background-color: #fffbeb; border-radius: 0 8px 8px 0; padding: 16px 20px;">
          <h3 style="color: #01312D; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Next Steps</h3>
          <ul style="color: #334155; margin: 0; padding: 0 0 0 18px; font-size: 13px; line-height: 2;">
            <li>Your configuration is valid for 30 days</li>
            {{#if no_price_yet}}<li style="color: #c2410c; font-weight: 600;">No price has been generated yet &ndash; complete your measurements to see pricing</li>{{/if}}
            <li>Use the link above to access and modify your shade sail</li>
            <li>Contact us if you have any questions</li>
          </ul>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 13px; margin: 0 0 6px 0;">
          Thank you for choosing <strong>ShadeSpace</strong> for your custom shade solution.
        </p>
        <p style="color: #64748B; font-size: 12px; margin: 0;">
          Need help? Contact us at <a href="mailto:sails@shadespace.com" style="color: #307C31; text-decoration: underline;">sails@shadespace.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>$SAVE$;

  pdf_html := $PDF$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ShadeSpace Shade Sail Configuration</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0;">
    <tr>
      <td style="background-color: #01312D; padding: 24px 20px; text-align: center;">
        <img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-white_3x_db41a610-bfc6-4f61-bb82-b95e27cd58d8.png?v=1728339549" alt="ShadeSpace" style="height: 40px; width: auto;" />
      </td>
    </tr>
    <tr>
      <td style="background-color: #307C31; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Your Custom Shade Sail Configuration</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 30px 15px 30px;">
        <p style="color: #01312D; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Hello {{customer_name}},</p>
        <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.7;">
          Thank you for configuring your custom shade sail with us. Your detailed PDF quote is attached to this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <h3 style="color: #01312D; margin: 0 0 12px 0; font-size: 16px; border-bottom: 2px solid #BFF102; padding-bottom: 6px;">Configuration Summary</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="color: #01312D; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; font-weight: bold;">Product Name</td><td style="color: #01312D; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{product_name}}</td></tr>
          <tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Fabric Material</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{fabric_type}}</td></tr>
          <tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Fabric Color</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{fabric_color}}</td></tr>
          {{#if shade_factor}}<tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Shade Factor</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{shade_factor}}</td></tr>{{/if}}
          <tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Edge Type</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{edge_type}}</td></tr>
          {{#if wire_or_webbing}}<tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{wire_or_webbing_label}}</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{wire_or_webbing}}</td></tr>{{/if}}
          <tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Corners</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{corners}}</td></tr>
          <tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Area</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{area}}</td></tr>
          <tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Perimeter</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{perimeter}}</td></tr>
        </table>
      </td>
    </tr>
    {{#if edge_measurements_html}}<tr><td>{{{edge_measurements_html}}}</td></tr>{{/if}}
    {{#if diagonal_measurements_html}}<tr><td>{{{diagonal_measurements_html}}}</td></tr>{{/if}}
    {{#if anchor_measurements_html}}<tr><td>{{{anchor_measurements_html}}}</td></tr>{{/if}}
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="color: #64748B; padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px;">Warranty</td><td style="color: #01312D; font-weight: 600; padding: 8px 0; text-align: right; border-bottom: 1px solid #E2E8F0; font-size: 14px;">{{warranty_years}} Years</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="color: #64748B; font-size: 11px; letter-spacing: 1px; margin-bottom: 4px;">QUOTE REFERENCE</div>
          <div style="color: #01312D; font-size: 18px; font-weight: bold; margin-bottom: 12px;">{{quote_reference}}</div>
          <div style="color: #64748B; font-size: 11px; letter-spacing: 1px; margin-bottom: 4px; border-top: 1px solid #e2e8f0; padding-top: 12px;">VALID UNTIL</div>
          <div style="color: #01312D; font-size: 16px; font-weight: bold;">{{pricing_locked_until}}</div>
        </div>
      </td>
    </tr>
    {{#if canvas_image}}<tr>
      <td style="padding: 0 30px 10px 30px;">
        <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px;"><img src="{{canvas_image}}" alt="Your custom shade sail design" style="width: 100%; max-width: 540px; height: auto; border-radius: 4px;" /></div>
        <p style="color: #64748B; font-size: 12px; text-align: center; margin: 8px 0 0 0;">Your custom shade sail design</p>
      </td>
    </tr>{{/if}}
    <tr>
      <td style="padding: 10px 30px 25px 30px;">
        <div style="background-color: #BFF102; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="color: #01312D; margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">All-Inclusive Price to Your Door</p>
          <p style="color: #01312D; margin: 0 0 10px 0; font-size: 32px; font-weight: bold;">{{price_formatted}}</p>
          <p style="color: #01312D; margin: 0; font-size: 12px; line-height: 1.8;">
            &#10003; Express freight to your door included<br/>
            &#10003; All taxes &amp; duties included<br/>
            &#10003; No hidden costs or tariffs
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 15px 30px; text-align: center;">
        <a href="{{resume_url}}" style="display: inline-block; background-color: #01312D; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 15px; font-weight: bold;">Access Your Quote Online</a>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 30px 25px 30px; text-align: center;">
        <p style="color: #64748B; font-size: 12px; margin: 0 0 4px 0;">Or copy this link:</p>
        <p style="color: #307C31; font-size: 11px; margin: 0; word-break: break-all; font-family: 'Courier New', monospace;">{{resume_url}}</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 13px; margin: 0 0 6px 0;">
          Thank you for choosing <strong>ShadeSpace</strong> for your custom shade solution.
        </p>
        <p style="color: #64748B; font-size: 12px; margin: 0;">
          Need help? Contact us at <a href="mailto:sails@shadespace.com" style="color: #307C31; text-decoration: underline;">sails@shadespace.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>$PDF$;

  INSERT INTO email_templates (template_key, name, description, subject, html_body, text_body, default_sender_id, is_active, transactional, subject_locked)
  VALUES (
    'configuration_saved',
    'Transactional: Configuration Saved',
    'Sent automatically when a customer saves their configurator progress.',
    'Your ShadeSpace Progress Has Been Saved - {{quote_reference}}',
    save_html,
    'Hello {{customer_name}},\n\nYour shade sail configuration has been saved. Quote reference {{quote_reference}}. Valid until {{pricing_locked_until}}.\n\nAccess your configuration: {{resume_url}}\n\nThank you for choosing ShadeSpace.',
    sender_uuid,
    true,
    true,
    true
  )
  ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    text_body = EXCLUDED.text_body,
    transactional = true,
    subject_locked = true,
    is_active = true,
    default_sender_id = COALESCE(email_templates.default_sender_id, EXCLUDED.default_sender_id);

  INSERT INTO email_templates (template_key, name, description, subject, html_body, text_body, default_sender_id, is_active, transactional, subject_locked)
  VALUES (
    'pdf_quote_delivery',
    'Transactional: PDF Quote Delivery',
    'Sent automatically when a customer requests their PDF quote from the configurator.',
    'Your ShadeSpace Quote - {{quote_reference}}',
    pdf_html,
    'Hello {{customer_name}},\n\nYour detailed shade sail quote is attached to this email. Quote reference {{quote_reference}}. Price {{price_formatted}}.\n\nAccess your quote online: {{resume_url}}\n\nThank you for choosing ShadeSpace.',
    sender_uuid,
    true,
    true,
    true
  )
  ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    text_body = EXCLUDED.text_body,
    transactional = true,
    subject_locked = true,
    is_active = true,
    default_sender_id = COALESCE(email_templates.default_sender_id, EXCLUDED.default_sender_id);
END $$;
