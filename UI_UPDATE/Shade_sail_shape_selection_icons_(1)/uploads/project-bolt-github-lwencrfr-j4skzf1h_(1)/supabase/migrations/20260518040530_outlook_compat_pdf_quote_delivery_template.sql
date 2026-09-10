/*
  # Outlook Classic compatibility - pdf_quote_delivery template

  1. Modified Templates
    - `pdf_quote_delivery` - full rewrite for Outlook Classic (Word rendering engine) compatibility

  2. Key Changes
    - Added MSO conditional comments for fixed-width container (640px)
    - Added XML namespace declarations for VML support
    - Added explicit width/height HTML attributes on all images
    - Replaced CSS border-radius buttons with VML v:roundrect bulletproof buttons
    - Replaced linear-gradient backgrounds with solid fallback (#BFF102 for price block)
    - Replaced rgba() colours with solid hex equivalents
    - Replaced div-based spacing with table cell padding
    - Added mso-line-height-rule:exactly for predictable line heights
    - Removed box-shadow (graceful degradation)
    - Used MSO conditional border-radius alternative for summary table

  3. Notes
    - Template remains visually identical in modern email clients
    - Outlook Classic shows rectangular buttons via VML
    - Configuration summary table uses alternating background rows (works in Outlook)
*/

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<title>Your Custom Shade Sail Quote</title>
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}a{text-decoration:none;}h1,h2,h3,h4,p{margin:0;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background-color:#eef2f3;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f3;"><tr><td align="center" style="padding:36px 14px;"><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f3;padding:36px 14px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.08);">
<!--<![endif]-->

<!-- Logo -->
<tr>
<td style="background-color:#ffffff;padding:30px 24px 10px 24px;text-align:center;">
<img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_8d83ab71-75cc-4486-8cf3-b510cdb69aa7.png?v=1728339550" alt="ShadeSpace" width="144" height="36" style="height:36px;width:144px;display:inline-block;border:0;outline:none;" />
</td>
</tr>

<!-- Dark green banner -->
<tr>
<td style="padding:8px 28px 0 28px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#01312D;"><tr><td style="padding:24px 28px;text-align:center;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#01312D;border-radius:14px;">
<tr>
<td style="padding:24px 28px;text-align:center;">
<!--<![endif]-->
<h1 style="color:#ffffff;margin:0;font-size:22px;line-height:28px;mso-line-height-rule:exactly;font-weight:800;letter-spacing:-0.3px;">Your custom shade sail quote</h1>
<!--[if mso]><table role="presentation" width="48" cellpadding="0" cellspacing="0" align="center" style="margin-top:10px;"><tr><td style="background-color:#BFF102;height:3px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table><![endif]-->
<!--[if !mso]><!-->
<div style="width:48px;height:3px;background-color:#BFF102;border-radius:2px;margin:10px auto 0 auto;"></div>
<!--<![endif]-->
<!--[if mso]></td></tr></table><![endif]-->
<!--[if !mso]><!-->
</td>
</tr>
</table>
<!--<![endif]-->
</td>
</tr>

<!-- Greeting -->
<tr>
<td style="padding:24px 36px 4px 36px;">
<p style="color:#0f172a;margin:0 0 12px 0;font-size:15px;line-height:22px;mso-line-height-rule:exactly;">Hi {{customer_name}},</p>
<p style="color:#475569;margin:0 0 18px 0;font-size:14px;line-height:24px;mso-line-height-rule:exactly;">Your detailed PDF quote is attached. Below is a summary of your configuration with the design diagram.</p>
</td>
</tr>

<!-- Canvas image -->
{{#if canvas_image}}<tr>
<td style="padding:6px 36px 10px 36px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;"><tr><td style="padding:16px;text-align:center;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:14px;">
<tr>
<td style="padding:16px;text-align:center;">
<!--<![endif]-->
<img src="{{canvas_image}}" alt="Your shade sail design" width="540" style="width:100%;max-width:540px;height:auto;display:block;margin:0 auto;border:0;outline:none;" />
<p style="color:#94a3b8;font-size:11px;margin:10px 0 0 0;line-height:16px;mso-line-height-rule:exactly;letter-spacing:0.3px;">YOUR CUSTOM SHADE SAIL DESIGN</p>
<!--[if mso]></td></tr></table><![endif]-->
<!--[if !mso]><!-->
</td>
</tr>
</table>
<!--<![endif]-->
</td>
</tr>{{/if}}

<!-- Configuration summary -->
<tr>
<td style="padding:18px 36px 6px 36px;">
<h2 style="color:#0f172a;margin:0 0 4px 0;font-size:17px;font-weight:800;">Configuration summary</h2>
<!--[if mso]><table role="presentation" width="36" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr><td style="background-color:#BFF102;height:2px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table><![endif]-->
<!--[if !mso]><!-->
<div style="width:36px;height:2px;background-color:#BFF102;border-radius:2px;margin:0 0 14px 0;"></div>
<!--<![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;width:45%;border-bottom:1px solid #e5e7eb;">Product</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{product_name}}</td></tr>
<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Fabric material</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{fabric_type}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Fabric colour</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{fabric_color}}</td></tr>
{{#if shade_factor}}<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Shade factor</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{shade_factor}}</td></tr>{{/if}}
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Edge type</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{edge_type}}</td></tr>
{{#if wire_or_webbing}}<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing_label}}</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing}}</td></tr>{{/if}}
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Corners</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{corners}}</td></tr>
<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Area</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{area}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Perimeter</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{perimeter}}</td></tr>
<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;">Warranty</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;">{{warranty_years}} years</td></tr>
</table>
</td>
</tr>

<!-- Precise measurements -->
<tr>
<td style="padding:20px 36px 6px 36px;">
<h2 style="color:#0f172a;margin:0 0 4px 0;font-size:17px;font-weight:800;">Precise measurements</h2>
<!--[if mso]><table role="presentation" width="36" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr><td style="background-color:#BFF102;height:2px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table><![endif]-->
<!--[if !mso]><!-->
<div style="width:36px;height:2px;background-color:#BFF102;border-radius:2px;margin:0 0 14px 0;"></div>
<!--<![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">
{{{edge_measurements_rows}}}
{{{diagonal_measurements_rows}}}
{{{anchor_measurements_rows}}}
</table>
</td>
</tr>

<!-- Quote reference box -->
<tr>
<td style="padding:18px 36px 8px 36px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e5e7eb;"><tr><td style="padding:16px 20px;text-align:center;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:14px;">
<tr>
<td style="padding:16px 20px;text-align:center;">
<!--<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:4px;"><span style="color:#64748B;font-size:11px;letter-spacing:1px;text-transform:uppercase;">QUOTE REFERENCE</span></td></tr>
<tr><td style="text-align:center;padding-bottom:12px;"><span style="color:#0f172a;font-size:17px;font-weight:800;">{{quote_reference}}</span></td></tr>
<tr><td style="padding:0 24px 12px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<tr><td style="text-align:center;padding-bottom:4px;"><span style="color:#64748B;font-size:11px;letter-spacing:1px;text-transform:uppercase;">VALID UNTIL</span></td></tr>
<tr><td style="text-align:center;"><span style="color:#0f172a;font-size:14px;font-weight:700;">{{pricing_locked_until}}</span></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<!--[if !mso]><!-->
</td>
</tr>
</table>
<!--<![endif]-->
</td>
</tr>

<!-- Price block -->
<tr>
<td style="padding:10px 36px 22px 36px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#BFF102;"><tr><td style="padding:24px 24px;text-align:center;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#BFF102;border-radius:14px;">
<tr>
<td style="padding:24px 24px;text-align:center;">
<!--<![endif]-->
<p style="color:#01312D;margin:0 0 4px 0;font-size:14px;font-weight:700;letter-spacing:0.3px;">ALL-INCLUSIVE PRICE TO YOUR DOOR</p>
<p style="color:#01312D;margin:0 0 10px 0;font-size:40px;font-weight:800;line-height:44px;mso-line-height-rule:exactly;">{{price_formatted}}</p>
<p style="color:#01312D;margin:0;font-size:12px;line-height:22px;mso-line-height-rule:exactly;">&#10003; Express freight to your door included<br/>&#10003; All taxes &amp; duties included<br/>&#10003; No hidden costs or tariffs</p>
<!--[if mso]></td></tr></table><![endif]-->
<!--[if !mso]><!-->
</td>
</tr>
</table>
<!--<![endif]-->
</td>
</tr>

<!-- CTA Button -->
<tr>
<td style="padding:0 36px 22px 36px;text-align:center;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="50%" strokecolor="#01312D" fillcolor="#01312D">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;">Access your quote online</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#01312D;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:999px;font-size:14px;font-weight:700;box-shadow:0 6px 18px rgba(1,49,45,0.25);">Access your quote online</a>
<!--<![endif]-->
<p style="color:#94a3b8;font-size:11px;margin:12px 0 0 0;line-height:16px;mso-line-height-rule:exactly;">Or paste this link into your browser:</p>
<p style="color:#475569;font-size:11px;margin:4px 0 0 0;word-break:break-all;font-family:''Courier New'',monospace;line-height:16px;mso-line-height-rule:exactly;">{{resume_url}}</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#f8fafc;padding:22px 30px;text-align:center;border-top:2px solid #BFF102;">
<p style="color:#475569;font-size:13px;margin:0 0 6px 0;line-height:20px;mso-line-height-rule:exactly;">Thanks for choosing <strong style="color:#01312D;">ShadeSpace</strong>.</p>
<p style="color:#94a3b8;font-size:11px;margin:0;line-height:18px;mso-line-height-rule:exactly;">Need help? <a href="mailto:sails@shadespace.com" style="color:#307C31;text-decoration:underline;">sails@shadespace.com</a> &middot; <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
</td>
</tr>

<!--[if mso]></table></td></tr></table><![endif]-->
<!--[if !mso]><!-->
</table>
</td></tr>
</table>
<!--<![endif]-->
</body>
</html>',
    updated_at = now()
WHERE template_key = 'pdf_quote_delivery';
