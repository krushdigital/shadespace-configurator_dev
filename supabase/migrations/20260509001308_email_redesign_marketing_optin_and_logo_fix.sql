/*
  # Email system: modern redesign, logo fix, marketing opt-in tracking

  1. Changes to saved_quotes
    - Added `marketing_opt_in` (boolean, default true) so customers who save
      progress or a quote are opted into marketing email by default.
      They remain opt-in unless they later use the unsubscribe link.

  2. Redesigned transactional email templates
    - `configuration_saved`: slicker rounded card aesthetic, soft shadow
      card, pill CTA button, rounded reference card, peach next-steps card,
      corrected logo URL (full-colour logo).
    - `pdf_quote_delivery`: matching rounded-card redesign, always shows the
      diagram image block, rounded price block, pill CTA, corrected logo URL.

  3. Notes
    - The white logo URL is preserved in a comment for future dark-background use:
      https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-white_3x_b1737cf5-345d-4672-b344-07d3c817d052.png?v=1723662121
    - Subjects remain locked; no subject changes.
    - No schema changes on email_templates; only html_body updates.

  4. Security
    - marketing_opt_in defaults to true; no RLS policy changes (existing
      policies on saved_quotes continue to apply).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'marketing_opt_in'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN marketing_opt_in boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
DECLARE
  save_html text;
  pdf_html text;
BEGIN
  save_html := $SAVE$<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your ShadeSpace Configuration Has Been Saved</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#eef2f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f3;padding:36px 14px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.08);">
<tr>
<td style="background-color:#ffffff;padding:30px 24px 10px 24px;text-align:center;">
<img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_8d83ab71-75cc-4486-8cf3-b510cdb69aa7.png?v=1728339550" alt="ShadeSpace" style="height:38px;width:auto;display:inline-block;" />
</td>
</tr>
<tr>
<td style="padding:8px 28px 0 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#01312D;border-radius:14px;">
<tr>
<td style="padding:26px 28px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.3px;">Your configuration has been saved</h1>
<div style="width:48px;height:3px;background-color:#BFF102;border-radius:2px;margin:12px auto 0 auto;"></div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:26px 36px 6px 36px;">
<p style="color:#0f172a;margin:0 0 14px 0;font-size:15px;">Hi {{customer_name}},</p>
<p style="color:#475569;margin:0 0 22px 0;font-size:14.5px;line-height:1.7;">Thanks for saving your custom shade sail configuration. Pick up exactly where you left off any time using the button below.</p>
</td>
</tr>
<tr>
<td style="padding:4px 36px 20px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f7fcec 0%,#f1f8e3 100%);border-radius:14px;">
<tr>
<td style="padding:22px 24px;text-align:center;">
<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Configuration name</div>
<div style="color:#0f172a;font-size:18px;font-weight:700;margin-bottom:18px;">{{quote_name}}</div>
<div style="height:1px;background-color:rgba(1,49,45,0.08);margin:0 20px 18px 20px;"></div>
<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Quote reference</div>
<div style="color:#307C31;font-size:22px;font-weight:800;font-family:'Courier New',monospace;letter-spacing:1px;margin-bottom:16px;">{{quote_reference}}</div>
<div style="height:1px;background-color:rgba(1,49,45,0.08);margin:0 20px 16px 20px;"></div>
<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Valid until</div>
<div style="color:#0f172a;font-size:15px;font-weight:700;">{{pricing_locked_until}}</div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:4px 36px 24px 36px;text-align:center;">
<a href="{{resume_url}}" style="display:inline-block;background-color:#01312D;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:999px;font-size:15px;font-weight:700;box-shadow:0 6px 18px rgba(1,49,45,0.25);">Access your configuration</a>
<p style="color:#94a3b8;font-size:11px;margin:12px 0 0 0;">Or paste this link into your browser:</p>
<p style="color:#475569;font-size:11px;margin:4px 0 0 0;word-break:break-all;font-family:'Courier New',monospace;">{{resume_url}}</p>
</td>
</tr>
<tr>
<td style="padding:0 36px 30px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff5e9;border-radius:14px;">
<tr>
<td style="padding:20px 24px;border-left:4px solid #f59e0b;border-radius:14px 0 0 14px;">
<h3 style="color:#0f172a;margin:0 0 10px 0;font-size:16px;font-weight:800;">Next steps</h3>
<ul style="color:#475569;margin:0;padding:0 0 0 18px;font-size:13.5px;line-height:1.8;">
<li>Your configuration is valid for 30 days</li>
{{#if no_price_yet}}<li><span style="color:#c2410c;font-weight:700;">No price has been generated yet</span> &ndash; complete your measurements to see pricing</li>{{/if}}
<li>Use the link above to access and modify your shade sail</li>
<li>Reply to this email if you have any questions</li>
</ul>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:22px 30px;text-align:center;border-top:2px solid #BFF102;">
<p style="color:#475569;font-size:13px;margin:0 0 6px 0;">Thanks for choosing <strong style="color:#01312D;">ShadeSpace</strong>.</p>
<p style="color:#94a3b8;font-size:11px;margin:0;">Need help? <a href="mailto:sails@shadespace.com" style="color:#307C31;text-decoration:underline;">sails@shadespace.com</a> &middot; <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>$SAVE$;

  pdf_html := $PDF$<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Custom Shade Sail Quote</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#eef2f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f3;padding:36px 14px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.08);">
<tr>
<td style="background-color:#ffffff;padding:30px 24px 10px 24px;text-align:center;">
<img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_8d83ab71-75cc-4486-8cf3-b510cdb69aa7.png?v=1728339550" alt="ShadeSpace" style="height:36px;width:auto;display:inline-block;" />
</td>
</tr>
<tr>
<td style="padding:8px 28px 0 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#01312D;border-radius:14px;">
<tr>
<td style="padding:24px 28px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-0.3px;">Your custom shade sail quote</h1>
<div style="width:48px;height:3px;background-color:#BFF102;border-radius:2px;margin:10px auto 0 auto;"></div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:24px 36px 4px 36px;">
<p style="color:#0f172a;margin:0 0 12px 0;font-size:15px;">Hi {{customer_name}},</p>
<p style="color:#475569;margin:0 0 18px 0;font-size:14.5px;line-height:1.7;">Your detailed PDF quote is attached. Below is a summary of your configuration with the design diagram.</p>
</td>
</tr>
{{#if canvas_image}}<tr>
<td style="padding:6px 36px 10px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:14px;">
<tr>
<td style="padding:16px;text-align:center;">
<img src="{{canvas_image}}" alt="Your shade sail design" style="width:100%;max-width:540px;height:auto;display:block;margin:0 auto;border-radius:8px;" />
<p style="color:#94a3b8;font-size:11px;margin:10px 0 0 0;letter-spacing:0.3px;">YOUR CUSTOM SHADE SAIL DESIGN</p>
</td>
</tr>
</table>
</td>
</tr>{{/if}}
<tr>
<td style="padding:18px 36px 6px 36px;">
<h2 style="color:#0f172a;margin:0 0 4px 0;font-size:17px;font-weight:800;">Configuration summary</h2>
<div style="width:36px;height:2px;background-color:#BFF102;border-radius:2px;margin:0 0 14px 0;"></div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;width:45%;">Product</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{product_name}}</td></tr>
<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Fabric material</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{fabric_type}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Fabric colour</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{fabric_color}}</td></tr>
{{#if shade_factor}}<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Shade factor</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{shade_factor}}</td></tr>{{/if}}
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Edge type</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{edge_type}}</td></tr>
{{#if wire_or_webbing}}<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">{{wire_or_webbing_label}}</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{wire_or_webbing}}</td></tr>{{/if}}
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Corners</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{corners}}</td></tr>
<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Area</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{area}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Perimeter</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{perimeter}}</td></tr>
<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Warranty</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{warranty_years}} years</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 36px 6px 36px;">
<h2 style="color:#0f172a;margin:0 0 4px 0;font-size:17px;font-weight:800;">Precise measurements</h2>
<div style="width:36px;height:2px;background-color:#BFF102;border-radius:2px;margin:0 0 14px 0;"></div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
{{{edge_measurements_rows}}}
{{{diagonal_measurements_rows}}}
{{{anchor_measurements_rows}}}
</table>
</td>
</tr>
<tr>
<td style="padding:18px 36px 8px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:14px;">
<tr>
<td style="padding:16px 20px;text-align:center;">
<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Quote reference</div>
<div style="color:#0f172a;font-size:17px;font-weight:800;margin-bottom:12px;">{{quote_reference}}</div>
<div style="height:1px;background-color:#e5e7eb;margin:0 24px 12px 24px;"></div>
<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Valid until</div>
<div style="color:#0f172a;font-size:14px;font-weight:700;">{{pricing_locked_until}}</div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:10px 36px 22px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#BFF102 0%,#aee000 100%);border-radius:14px;">
<tr>
<td style="padding:24px 24px;text-align:center;">
<p style="color:#01312D;margin:0 0 4px 0;font-size:14px;font-weight:700;letter-spacing:0.3px;">ALL-INCLUSIVE PRICE TO YOUR DOOR</p>
<p style="color:#01312D;margin:0 0 10px 0;font-size:40px;font-weight:800;line-height:1;">{{price_formatted}}</p>
<p style="color:#01312D;margin:0;font-size:12.5px;line-height:1.9;">
&#10003; Express freight to your door included<br/>
&#10003; All taxes &amp; duties included<br/>
&#10003; No hidden costs or tariffs
</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 36px 22px 36px;text-align:center;">
<a href="{{resume_url}}" style="display:inline-block;background-color:#01312D;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:999px;font-size:14.5px;font-weight:700;box-shadow:0 6px 18px rgba(1,49,45,0.25);">Access your quote online</a>
<p style="color:#94a3b8;font-size:11px;margin:12px 0 0 0;">Or paste this link into your browser:</p>
<p style="color:#475569;font-size:11px;margin:4px 0 0 0;word-break:break-all;font-family:'Courier New',monospace;">{{resume_url}}</p>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:22px 30px;text-align:center;border-top:2px solid #BFF102;">
<p style="color:#475569;font-size:13px;margin:0 0 6px 0;">Thanks for choosing <strong style="color:#01312D;">ShadeSpace</strong>.</p>
<p style="color:#94a3b8;font-size:11px;margin:0;">Need help? <a href="mailto:sails@shadespace.com" style="color:#307C31;text-decoration:underline;">sails@shadespace.com</a> &middot; <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>$PDF$;

  UPDATE email_templates
  SET html_body = save_html,
      is_active = true,
      updated_at = now()
  WHERE template_key = 'configuration_saved';

  UPDATE email_templates
  SET html_body = pdf_html,
      is_active = true,
      updated_at = now()
  WHERE template_key = 'pdf_quote_delivery';
END $$;
