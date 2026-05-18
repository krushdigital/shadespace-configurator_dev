/*
  # Outlook Classic compatibility - configuration_saved template

  1. Modified Templates
    - `configuration_saved` - full rewrite for Outlook Classic (Word rendering engine) compatibility

  2. Key Changes
    - Added MSO conditional comments for fixed-width container (640px)
    - Added XML namespace declarations for VML support
    - Added explicit width/height HTML attributes on logo image
    - Replaced CSS border-radius buttons with VML v:roundrect bulletproof buttons
    - Replaced linear-gradient backgrounds with solid fallback colours
    - Replaced rgba() colours with solid hex equivalents
    - Replaced div-based spacing with table cell padding
    - Added mso-line-height-rule:exactly for predictable line heights
    - Removed box-shadow (graceful degradation, Outlook ignores it)
    - Removed onerror JS fallback on images (Outlook does not execute JS)

  3. Notes
    - The template remains visually identical in modern email clients
    - Outlook Classic will show square-ish buttons via VML approximation
    - Gradient backgrounds fall back to solid: #f7fcec (config card), #BFF102 (price block)
*/

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<title>Your ShadeSpace Configuration Has Been Saved</title>
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}a{text-decoration:none;}h1,h2,h3,h4,p{margin:0;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background-color:#eef2f3;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f3;"><tr><td align="center" style="padding:36px 14px;"><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f3;padding:36px 14px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.08);">
<!--<![endif]-->

<!-- Logo Row -->
<tr>
<td style="background-color:#ffffff;padding:30px 24px 10px 24px;text-align:center;">
<img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_8d83ab71-75cc-4486-8cf3-b510cdb69aa7.png?v=1728339550" alt="ShadeSpace" width="152" height="38" style="height:38px;width:152px;display:inline-block;border:0;outline:none;" />
</td>
</tr>

<!-- Dark green banner -->
<tr>
<td style="padding:8px 28px 0 28px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#01312D;"><tr><td style="padding:26px 28px;text-align:center;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#01312D;border-radius:14px;">
<tr>
<td style="padding:26px 28px;text-align:center;">
<!--<![endif]-->
<h1 style="color:#ffffff;margin:0;font-size:24px;line-height:30px;mso-line-height-rule:exactly;font-weight:800;letter-spacing:-0.3px;">Your configuration has been saved</h1>
<!--[if mso]><table role="presentation" width="48" cellpadding="0" cellspacing="0" align="center" style="margin-top:12px;"><tr><td style="background-color:#BFF102;height:3px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table><![endif]-->
<!--[if !mso]><!-->
<div style="width:48px;height:3px;background-color:#BFF102;border-radius:2px;margin:12px auto 0 auto;"></div>
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
<td style="padding:26px 36px 6px 36px;">
<p style="color:#0f172a;margin:0 0 14px 0;font-size:15px;line-height:22px;mso-line-height-rule:exactly;">Hi {{customer_name}},</p>
<p style="color:#475569;margin:0 0 22px 0;font-size:14px;line-height:24px;mso-line-height-rule:exactly;">Thanks for saving your custom shade sail configuration. Pick up exactly where you left off any time using the button below.</p>
</td>
</tr>

<!-- Configuration card -->
<tr>
<td style="padding:4px 36px 20px 36px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fcec;"><tr><td style="padding:22px 24px;text-align:center;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fcec;border-radius:14px;">
<tr>
<td style="padding:22px 24px;text-align:center;">
<!--<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:4px;"><span style="color:#64748B;font-size:11px;letter-spacing:1px;text-transform:uppercase;">CONFIGURATION NAME</span></td></tr>
<tr><td style="text-align:center;padding-bottom:18px;"><span style="color:#0f172a;font-size:18px;font-weight:700;">{{quote_name}}</span></td></tr>
<tr><td style="padding:0 20px 18px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #d9e5d0;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<tr><td style="text-align:center;padding-bottom:4px;"><span style="color:#64748B;font-size:11px;letter-spacing:1px;text-transform:uppercase;">QUOTE REFERENCE</span></td></tr>
<tr><td style="text-align:center;padding-bottom:16px;"><span style="color:#307C31;font-size:22px;font-weight:800;font-family:''Courier New'',monospace;letter-spacing:1px;">{{quote_reference}}</span></td></tr>
<tr><td style="padding:0 20px 16px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #d9e5d0;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>
<tr><td style="text-align:center;padding-bottom:4px;"><span style="color:#64748B;font-size:11px;letter-spacing:1px;text-transform:uppercase;">VALID UNTIL</span></td></tr>
<tr><td style="text-align:center;"><span style="color:#0f172a;font-size:15px;font-weight:700;">{{pricing_locked_until}}</span></td></tr>
</table>
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
<td style="padding:4px 36px 24px 36px;text-align:center;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="50%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Access your configuration</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:999px;font-size:15px;font-weight:700;box-shadow:0 6px 18px rgba(1,49,45,0.25);">Access your configuration</a>
<!--<![endif]-->
<p style="color:#94a3b8;font-size:11px;margin:12px 0 0 0;line-height:16px;mso-line-height-rule:exactly;">Or paste this link into your browser:</p>
<p style="color:#475569;font-size:11px;margin:4px 0 0 0;word-break:break-all;font-family:''Courier New'',monospace;line-height:16px;mso-line-height-rule:exactly;">{{resume_url}}</p>
</td>
</tr>

<!-- Next steps box -->
<tr>
<td style="padding:0 36px 20px 36px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff5e9;border-left:4px solid #f59e0b;"><tr><td style="padding:20px 24px;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff5e9;border-radius:14px;">
<tr>
<td style="padding:20px 24px;border-left:4px solid #f59e0b;">
<!--<![endif]-->
<h3 style="color:#0f172a;margin:0 0 10px 0;font-size:16px;font-weight:800;">Next steps</h3>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:24px;mso-line-height-rule:exactly;color:#475569;">
<tr><td valign="top" style="padding:0 8px 4px 0;">&bull;</td><td style="padding-bottom:4px;">Your configuration is valid for 30 days</td></tr>
{{#if no_price_yet}}<tr><td valign="top" style="padding:0 8px 4px 0;">&bull;</td><td style="padding-bottom:4px;"><span style="color:#c2410c;font-weight:700;">No price has been generated yet</span> &ndash; complete your measurements to see pricing</td></tr>{{/if}}
<tr><td valign="top" style="padding:0 8px 4px 0;">&bull;</td><td style="padding-bottom:4px;">Use the link above to access and modify your shade sail</td></tr>
<tr><td valign="top" style="padding:0 8px 4px 0;">&bull;</td><td style="padding-bottom:4px;">Reply to this email if you have any questions</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<!--[if !mso]><!-->
</td>
</tr>
</table>
<!--<![endif]-->
</td>
</tr>

<!-- Account section -->
<tr>
<td style="padding:0 36px 30px 36px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;"><tr><td style="padding:18px 22px;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr>
<td style="padding:18px 22px;">
<!--<![endif]-->
<h4 style="color:#01312D;margin:0 0 8px 0;font-size:14px;font-weight:700;">Your ShadeSpace Account</h4>
<p style="color:#64748B;margin:0 0 12px 0;font-size:13px;line-height:20px;mso-line-height-rule:exactly;">All your saved designs and quotes are stored in your ShadeSpace account. View saved designs, resume editing, or add to cart any time &mdash; just sign in with your email, no password needed.</p>
<a href="{{account_designs_url}}" style="color:#307C31;font-size:13px;font-weight:600;text-decoration:underline;">View all saved designs &rarr;</a>
<!--[if mso]></td></tr></table><![endif]-->
<!--[if !mso]><!-->
</td>
</tr>
</table>
<!--<![endif]-->
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
WHERE template_key = 'configuration_saved';
