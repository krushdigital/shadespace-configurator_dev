/*
  # Add price drop notification email template

  1. New Email Template
    - `price_drop_notification` - Sent by admin when prices are regenerated lower
    - Informs customer their quote price has been reduced
    - Includes old price, new price, savings, and link to view updated quote

  2. Important Notes
    - Template uses same HTML shell as existing templates
    - Merges with existing sender (hello@shadespace.com)
    - Will not overwrite if template already exists
*/

DO $$
DECLARE
  sender_id uuid;
  base_html text;
BEGIN
  SELECT id INTO sender_id FROM email_senders WHERE is_default = true LIMIT 1;

  base_html := '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;"><tr><td style="padding:24px;">__BODY__<p style="margin-top:32px;">Cheers,<br/>{{sender_first_name}}<br/>Shade Systems Global<br/>{{support_phone}}</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/><p style="font-size:12px;color:#6b7280;">You are receiving this because you saved a shade sail quote at shadespace.com. <a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a>.</p></td></tr></table>';

  INSERT INTO email_templates (template_key, name, description, subject, html_body, text_body, default_sender_id, is_active) VALUES
  (
    'price_drop_notification',
    'Price Drop Notification',
    'Sent when admin regenerates prices and a customer quote price has decreased.',
    'Great news - your shade sail quote just got cheaper, {{first_name}}!',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>I have some good news - we have just reduced our pricing and your saved quote has dropped from <strong>{{old_price_formatted}}</strong> down to <strong>{{new_price_formatted}}</strong>.</p><p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;font-size:18px;font-weight:600;color:#166534;">You save {{savings_formatted}}</p><p>Your updated quote is ready to view - the new price is already locked in for you.</p><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View my updated quote</a></p><p>If you have any questions or want to go ahead, just reply to this email.</p>'
    ),
    'Hi {{first_name}}, great news - your shade sail quote has dropped from {{old_price_formatted}} to {{new_price_formatted}}. You save {{savings_formatted}}. View your updated quote: {{resume_url}}',
    sender_id, true
  )
  ON CONFLICT (template_key) DO NOTHING;
END $$;
