/*
  # Redesign transactional email templates

  1. Updates
    - `configuration_saved` template: new HTML body matching the approved Save Progress design
      (white logo header, dark green banner, lime-bordered config card, lime CTA bar with dark-green button,
      orange "Next Steps" card with conditional no-price-yet note, light grey footer).
    - `pdf_quote_delivery` template: new HTML body matching the approved PDF Quote design
      (white logo header, dark green banner, Configuration Summary, Precise Measurements,
      grey reference/valid-until box, diagram, lime full-width price block, dark-green pill CTA, footer).

  2. Security
    - No schema or RLS changes; pure content updates via UPDATE on existing rows.

  3. Notes
    - Subject lines remain locked to the user-specified strings.
    - transactional = true and subject_locked = true are re-asserted defensively.
*/

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
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background-color:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">
<tr>
<td style="background-color:#ffffff;padding:28px 20px;text-align:center;border-bottom:1px solid #eef0f2;">
<img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-black_3x.png?v=1728339549" alt="ShadeSpace" style="height:38px;width:auto;display:inline-block;" onerror="this.onerror=null;this.src='https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-white_3x_db41a610-bfc6-4f61-bb82-b95e27cd58d8.png?v=1728339549';this.style.filter='invert(1)';" />
</td>
</tr>
<tr>
<td style="background-color:#01312D;padding:28px 24px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:26px;line-height:1.2;font-weight:800;">Your Configuration Has Been Saved!</h1>
</td>
</tr>
<tr>
<td style="padding:28px 32px 8px 32px;">
<p style="color:#0f172a;margin:0 0 16px 0;font-size:15px;">Hello {{customer_name}},</p>
<p style="color:#334155;margin:0 0 20px 0;font-size:14px;line-height:1.7;">Thank you for saving your custom shade sail configuration with ShadeSpace. Your configuration has been saved and you can continue where you left off anytime using the link below.</p>
</td>
</tr>
<tr>
<td style="padding:8px 32px 20px 32px;">
<div style="border:2px solid #BFF102;background-color:#f6fafc;border-radius:6px;padding:22px;text-align:center;">
<div style="color:#475569;font-size:13px;margin-bottom:4px;">Configuration Name</div>
<div style="color:#0f172a;font-size:18px;font-weight:700;margin-bottom:14px;">{{quote_name}}</div>
<div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:2px;">Quote Reference</div>
<div style="color:#307C31;font-size:26px;font-weight:800;font-family:'Courier New',monospace;letter-spacing:1px;margin-bottom:14px;">{{quote_reference}}</div>
<div style="color:#475569;font-size:13px;margin-bottom:2px;">Valid Until</div>
<div style="color:#0f172a;font-size:16px;font-weight:700;">{{pricing_locked_until}}</div>
</div>
</td>
</tr>
<tr>
<td style="padding:4px 32px 22px 32px;">
<div style="background-color:#BFF102;border-radius:6px;padding:14px;text-align:center;">
<a href="{{resume_url}}" style="display:inline-block;background-color:#01312D;color:#ffffff;text-decoration:none;padding:16px 54px;border-radius:4px;font-size:16px;font-weight:700;">Access Your Configuration</a>
</div>
</td>
</tr>
<tr>
<td style="padding:0 32px 24px 32px;text-align:center;">
<p style="color:#64748B;font-size:12px;margin:0 0 6px 0;">Or copy this link:</p>
<p style="color:#4f46e5;font-size:12px;margin:0;word-break:break-all;font-family:'Courier New',monospace;">{{resume_url}}</p>
</td>
</tr>
<tr>
<td style="padding:0 32px 28px 32px;">
<div style="border-left:5px solid #f59e0b;background-color:#fef3e7;border-radius:0 6px 6px 0;padding:18px 22px;">
<h3 style="color:#0f172a;margin:0 0 10px 0;font-size:17px;font-weight:800;">Next Steps</h3>
<ul style="color:#334155;margin:0;padding:0 0 0 20px;font-size:14px;line-height:1.9;">
<li>Your configuration is valid for 30 days</li>
{{#if no_price_yet}}<li><span style="color:#c2410c;font-weight:700;">No price has been generated yet</span> &ndash; complete your measurements to see pricing</li>{{/if}}
<li>Use the link above to access and modify your shade sail</li>
<li>Contact us if you have any questions</li>
</ul>
</div>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:22px 30px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="color:#334155;font-size:13px;margin:0 0 6px 0;">Thank you for choosing <strong>ShadeSpace</strong> for your custom shade solution.</p>
<p style="color:#64748B;font-size:12px;margin:0;">Need help? Contact us at <a href="mailto:sails@shadespace.com" style="color:#307C31;text-decoration:underline;">sails@shadespace.com</a></p>
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
<title>Your Custom Shade Sail Configuration</title>
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background-color:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">
<tr>
<td style="background-color:#ffffff;padding:24px 20px;text-align:center;border-bottom:1px solid #eef0f2;">
<img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-black_3x.png?v=1728339549" alt="ShadeSpace" style="height:34px;width:auto;display:inline-block;" onerror="this.onerror=null;this.src='https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-white_3x_db41a610-bfc6-4f61-bb82-b95e27cd58d8.png?v=1728339549';this.style.filter='invert(1)';" />
</td>
</tr>
<tr>
<td style="background-color:#01312D;padding:22px 24px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:22px;line-height:1.2;font-weight:800;">Your Custom Shade Sail Configuration</h1>
</td>
</tr>
<tr>
<td style="padding:26px 32px 4px 32px;">
<p style="color:#0f172a;margin:0 0 14px 0;font-size:15px;">Hello {{customer_name}},</p>
<p style="color:#334155;margin:0 0 20px 0;font-size:14px;line-height:1.7;">Thank you for configuring your custom shade sail with us. Your detailed PDF quote is attached to this email.</p>
</td>
</tr>
<tr>
<td style="padding:6px 32px 6px 32px;">
<h2 style="color:#0f172a;margin:0 0 12px 0;font-size:18px;font-weight:800;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Configuration Summary</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;width:45%;border-bottom:1px solid #f1f5f9;">Product Name</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{product_name}}</td></tr>
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;">Fabric Material</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{fabric_type}}</td></tr>
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;">Fabric Color</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{fabric_color}}</td></tr>
{{#if shade_factor}}<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;">Shade Factor</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{shade_factor}}</td></tr>{{/if}}
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;">Edge Type</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{edge_type}}</td></tr>
{{#if wire_or_webbing}}<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;">{{wire_or_webbing_label}}</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{wire_or_webbing}}</td></tr>{{/if}}
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;">Corners</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{corners}}</td></tr>
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;border-bottom:1px solid #f1f5f9;">Area</td><td style="color:#0f172a;padding:10px 0;font-size:14px;border-bottom:1px solid #f1f5f9;">{{area}}</td></tr>
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;">Perimeter</td><td style="color:#0f172a;padding:10px 0;font-size:14px;">{{perimeter}}</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 32px 6px 32px;">
<h2 style="color:#0f172a;margin:0 0 12px 0;font-size:18px;font-weight:800;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Precise Measurements</h2>
{{{edge_measurements_rows}}}
{{{diagonal_measurements_rows}}}
{{{anchor_measurements_rows}}}
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color:#0f172a;padding:10px 0;font-size:14px;font-weight:700;width:45%;">Warranty</td><td style="color:#0f172a;padding:10px 0;font-size:14px;">{{warranty_years}} Years</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:10px 32px 18px 32px;">
<div style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:18px;text-align:center;">
<div style="color:#64748B;font-size:11px;letter-spacing:1.5px;margin-bottom:4px;">QUOTE REFERENCE</div>
<div style="color:#0f172a;font-size:17px;font-weight:800;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">{{quote_reference}}</div>
<div style="color:#64748B;font-size:11px;letter-spacing:1.5px;margin:12px 0 4px 0;">VALID UNTIL</div>
<div style="color:#0f172a;font-size:15px;font-weight:700;">{{pricing_locked_until}}</div>
</div>
</td>
</tr>
{{#if canvas_image}}<tr>
<td style="padding:4px 32px 10px 32px;">
<div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px;background-color:#ffffff;">
<img src="{{canvas_image}}" alt="Your custom shade sail design" style="width:100%;max-width:560px;height:auto;display:block;margin:0 auto;" />
</div>
<p style="color:#64748B;font-size:12px;text-align:center;margin:8px 0 0 0;">Your custom shade sail design</p>
</td>
</tr>{{/if}}
<tr>
<td style="padding:14px 32px 22px 32px;">
<div style="background-color:#BFF102;border-radius:6px;padding:22px;text-align:center;">
<p style="color:#0f172a;margin:0 0 4px 0;font-size:15px;font-weight:700;">All-Inclusive Price to Your Door</p>
<p style="color:#0f172a;margin:0 0 10px 0;font-size:36px;font-weight:800;line-height:1;">{{price_formatted}}</p>
<p style="color:#0f172a;margin:0;font-size:12px;line-height:1.8;">
&#10003; Express freight to your door included<br/>
&#10003; All taxes &amp; duties included<br/>
&#10003; No hidden costs or tariffs
</p>
</div>
</td>
</tr>
<tr>
<td style="padding:0 32px 14px 32px;text-align:center;">
<a href="{{resume_url}}" style="display:inline-block;background-color:#01312D;color:#ffffff;text-decoration:none;padding:15px 44px;border-radius:8px;font-size:15px;font-weight:700;">Access Your Quote Online</a>
</td>
</tr>
<tr>
<td style="padding:0 32px 26px 32px;text-align:center;">
<p style="color:#64748B;font-size:12px;margin:0 0 6px 0;">Or copy this link:</p>
<p style="color:#307C31;font-size:11px;margin:0;word-break:break-all;font-family:'Courier New',monospace;">{{resume_url}}</p>
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:22px 30px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="color:#334155;font-size:13px;margin:0 0 6px 0;">Thank you for choosing <strong>ShadeSpace</strong> for your custom shade solution.</p>
<p style="color:#64748B;font-size:12px;margin:0;">Need help? Contact us at <a href="mailto:sails@shadespace.com" style="color:#307C31;text-decoration:underline;">sails@shadespace.com</a></p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>$PDF$;

  UPDATE email_templates
  SET html_body = save_html,
      subject = 'Your ShadeSpace Progress Has Been Saved - {{quote_reference}}',
      transactional = true,
      subject_locked = true,
      is_active = true,
      updated_at = now()
  WHERE template_key = 'configuration_saved';

  UPDATE email_templates
  SET html_body = pdf_html,
      subject = 'Your ShadeSpace Quote - {{quote_reference}}',
      transactional = true,
      subject_locked = true,
      is_active = true,
      updated_at = now()
  WHERE template_key = 'pdf_quote_delivery';
END $$;
