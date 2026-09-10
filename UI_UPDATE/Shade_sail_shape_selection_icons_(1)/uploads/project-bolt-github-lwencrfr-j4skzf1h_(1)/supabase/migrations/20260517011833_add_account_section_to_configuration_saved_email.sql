/*
  # Add "Your ShadeSpace Account" section to configuration_saved email

  1. Modified Templates
    - `configuration_saved` - adds a subtle secondary panel between the "Next steps"
      box and the footer, informing the customer that all their saved designs are
      accessible from their ShadeSpace account. The primary CTA ("Access your
      configuration") remains unchanged and dominant.

  2. New Template Variables
    - `account_designs_url` - URL to the My Designs page on the storefront

  3. Important Notes
    - The account section is intentionally subdued (light grey background, smaller text,
      text link instead of a button) so it never competes with the primary action.
    - Existing email flow and rendering is unaffected for customers who ignore the section.
*/

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your ShadeSpace Configuration Has Been Saved</title>
</head>
<body style="margin:0;padding:0;font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;background-color:#eef2f3;">
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
<div style="color:#307C31;font-size:22px;font-weight:800;font-family:''Courier New'',monospace;letter-spacing:1px;margin-bottom:16px;">{{quote_reference}}</div>
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
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:999px;font-size:15px;font-weight:700;box-shadow:0 6px 18px rgba(1,49,45,0.25);">Access your configuration</a>
<p style="color:#94a3b8;font-size:11px;margin:12px 0 0 0;">Or paste this link into your browser:</p>
<p style="color:#475569;font-size:11px;margin:4px 0 0 0;word-break:break-all;font-family:''Courier New'',monospace;">{{resume_url}}</p>
</td>
</tr>
<tr>
<td style="padding:0 36px 20px 36px;">
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
<td style="padding:0 36px 30px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
<tr>
<td style="padding:18px 22px;">
<h4 style="color:#01312D;margin:0 0 8px 0;font-size:14px;font-weight:700;">Your ShadeSpace Account</h4>
<p style="color:#64748B;margin:0 0 12px 0;font-size:13px;line-height:1.6;">All your saved designs and quotes are stored in your ShadeSpace account. View saved designs, resume editing, or add to cart any time &mdash; just sign in with your email, no password needed.</p>
<a href="{{account_designs_url}}" style="color:#307C31;font-size:13px;font-weight:600;text-decoration:underline;">View all saved designs &rarr;</a>
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
</html>'
WHERE template_key = 'configuration_saved';
