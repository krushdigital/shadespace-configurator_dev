/*
  # Simplify pdf_quote_delivery template for Gmail inbox placement

  1. Changes
    - Replace large lime-green promotional price block with a simple, subtle price row
    - Remove marketing-style checkmark benefit list (freight, taxes, no hidden costs)
    - Replace large styled CTA button with a simple text link
    - Remove promotional "ALL-INCLUSIVE PRICE TO YOUR DOOR" headline
    - Remove lime border on footer
    - Keep: configuration summary, quote reference, canvas image, greeting, footer
  2. Why
    - Gmail classifies emails with large colored CTA buttons, benefit lists, and
      promotional pricing blocks as "Promotional"
    - Transactional emails should focus on delivering requested information plainly
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

<!-- Greeting -->
<tr>
<td style="padding:24px 36px 4px 36px;">
<p style="color:#0f172a;margin:0 0 12px 0;font-size:15px;line-height:22px;mso-line-height-rule:exactly;">Hi {{customer_name}},</p>
<p style="color:#475569;margin:0 0 18px 0;font-size:14px;line-height:24px;mso-line-height-rule:exactly;">Your detailed PDF quote is attached to this email. Below is a summary of your configuration.</p>
</td>
</tr>

<!-- Quote reference and price -->
<tr>
<td style="padding:6px 36px 14px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;">
<tr>
<td style="padding:16px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="color:#64748B;font-size:12px;letter-spacing:0.5px;">Quote reference</td>
<td style="color:#0f172a;font-size:15px;font-weight:700;text-align:right;">{{quote_reference}}</td>
</tr>
<tr><td colspan="2" style="padding:8px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<tr>
<td style="color:#64748B;font-size:12px;letter-spacing:0.5px;">Total price</td>
<td style="color:#0f172a;font-size:15px;font-weight:700;text-align:right;">{{price_formatted}}</td>
</tr>
<tr><td colspan="2" style="padding:8px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<tr>
<td style="color:#64748B;font-size:12px;letter-spacing:0.5px;">Valid until</td>
<td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;">{{pricing_locked_until}}</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<!-- Canvas image -->
{{#if canvas_image}}<tr>
<td style="padding:6px 36px 10px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;">
<tr>
<td style="padding:16px;text-align:center;">
<img src="{{canvas_image}}" alt="Your shade sail design" width="540" style="width:100%;max-width:540px;height:auto;display:block;margin:0 auto;border:0;outline:none;" />
</td>
</tr>
</table>
</td>
</tr>{{/if}}

<!-- Configuration summary -->
<tr>
<td style="padding:14px 36px 6px 36px;">
<h2 style="color:#0f172a;margin:0 0 12px 0;font-size:16px;font-weight:700;">Configuration summary</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;width:45%;border-bottom:1px solid #e5e7eb;">Product</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{product_name}}</td></tr>
<tr><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Fabric material</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{fabric_type}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Fabric colour</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{fabric_color}}</td></tr>
{{#if shade_factor}}<tr><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Shade factor</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{shade_factor}}</td></tr>{{/if}}
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Edge type</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{edge_type}}</td></tr>
{{#if wire_or_webbing}}<tr><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing_label}}</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing}}</td></tr>{{/if}}
<tr><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Thread</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{thread_type}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Corners</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{corners}}</td></tr>
<tr><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Area</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{area}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Perimeter</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">{{perimeter}}</td></tr>
<tr><td style="color:#475569;padding:10px 14px;font-size:13px;font-weight:600;">Warranty</td><td style="color:#0f172a;padding:10px 14px;font-size:13px;">{{warranty_years}} years</td></tr>
</table>
</td>
</tr>

<!-- Access link -->
<tr>
<td style="padding:18px 36px 22px 36px;">
<p style="color:#475569;font-size:13px;margin:0 0 6px 0;line-height:20px;mso-line-height-rule:exactly;">You can also access your quote online at any time:</p>
<p style="margin:0;"><a href="{{resume_url}}" style="color:#307C31;font-size:13px;text-decoration:underline;">{{resume_url}}</a></p>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#f8fafc;padding:22px 30px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="color:#475569;font-size:13px;margin:0 0 6px 0;line-height:20px;mso-line-height-rule:exactly;">Thanks for choosing <strong style="color:#01312D;">ShadeSpace</strong>.</p>
<p style="color:#94a3b8;font-size:11px;margin:0;line-height:18px;mso-line-height-rule:exactly;">Need help? <a href="mailto:sails@shadespace.com" style="color:#307C31;text-decoration:underline;">sails@shadespace.com</a></p>
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