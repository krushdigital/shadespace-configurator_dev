/*
  # Outlook Classic compatibility - step/marketing/hot-lead/price-drop templates

  1. Modified Templates
    - `step_0_fabric_saved` through `step_5_heights_saved` (6 templates)
    - `step_6_hot_lead`
    - `pdf_downloaded_followup`
    - `price_drop_notification`

  2. Key Changes
    - Added MSO conditional wrapper for fixed 640px width (Outlook ignores max-width)
    - Added VML v:roundrect bulletproof buttons for all CTA links
    - Added explicit mso-line-height-rule for consistent spacing
    - Added xmlns declarations for VML support
    - Removed border-radius reliance (Outlook ignores it; kept for modern clients)

  3. Notes
    - These simpler text-style emails already use table-based layouts
    - Main fixes are the width container and button rendering
    - Visual appearance unchanged in modern clients
*/

-- Helper function to wrap simple email body in Outlook-safe shell
-- We will build each template inline since they have unique content

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">Nice choice saving {{fabric_type}} in {{fabric_color}} for your sail.</p>
<p style="margin:0 0 16px 0;">All of our fabrics (ExtraBlock 330, Monotec 370 and ShadeTec 320) block up to 98&#37; of UV and are built for tough sun, wind and coastal climates.</p>
<p style="margin:0 0 24px 0;">Want to keep going?</p>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Continue my design</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Continue my design</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'step_0_fabric_saved';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">Good call saving your edge style.</p>
<p style="margin:0 0 16px 0;">We custom-cut every sail to your exact measurements, so the edges you choose carry through to a sail that fits right the first time.</p>
<p style="margin:0 0 24px 0;">Ready to add your corners?</p>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Keep designing</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Keep designing</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'step_1_style_saved';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">You went with {{corners}} corners - nice.</p>
<p style="margin:0 0 16px 0;">We can make any shape or size, so whatever corner count fits your space, we will cut it to match.</p>
<p style="margin:0 0 24px 0;">Let us get your measurements in.</p>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Keep designing</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Keep designing</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'step_2_corners_saved';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">Your measurements are saved.</p>
<p style="margin:0 0 16px 0;">Our configurator guides you through every step, so if anything feels unclear, reply and we will help.</p>
<p style="margin:0 0 24px 0;">Ready for dimensions?</p>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:230px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Continue to dimensions</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Continue to dimensions</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'step_3_measurement_saved';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">Your dimensions are saved.</p>
<p style="margin:0 0 16px 0;">Because we custom-cut every sail, getting these right means yours will fit perfectly the first time - no &ldquo;close enough&rdquo;.</p>
<p style="margin:0 0 24px 0;">Reply any time with a sketch or photo and we will sanity-check it for you.</p>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Continue to heights</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Continue to heights</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'step_4_dimensions_saved';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">Nice work - your anchor heights are locked in.</p>
<p style="margin:0 0 16px 0;">One last step and you will see your price, shipped free by express worldwide with taxes and duties included.</p>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:190px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Review my quote</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Review my quote</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'step_5_heights_saved';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">Your quote <strong>{{quote_reference}}</strong> is saved and ready.</p>
<p style="margin:0 0 16px 0;">Price is locked for 30 days - includes free DHL Express shipping worldwide with taxes and duties covered, plus our 10-15 year fabric and workmanship warranty.</p>
<p style="margin:0 0 24px 0;">Reply any time with questions, or jump back in below.</p>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Open my quote</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Open my quote</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'step_6_hot_lead';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
<!--<![endif]-->
<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">I saw you downloaded the PDF for {{quote_reference}} a couple of days ago. Totally fine if you are still thinking - I just wanted to put my hand up and offer to answer anything the quote does not explain clearly.</p>
<p style="margin:0 0 16px 0;">Common questions I get at this stage:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;margin-bottom:16px;">
<tr><td valign="top" style="padding:0 8px 4px 0;">&bull;</td><td style="padding-bottom:4px;">How long does installation take? (usually half a day for residential)</td></tr>
<tr><td valign="top" style="padding:0 8px 4px 0;">&bull;</td><td style="padding-bottom:4px;">What is the wind rating? (varies by fabric - I can quote yours)</td></tr>
<tr><td valign="top" style="padding:0 8px 4px 0;">&bull;</td><td style="padding-bottom:4px;">Can I see a real install nearby? (often yes, just ask)</td></tr>
</table>
<p style="margin:0 0 28px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="14%" strokecolor="#307C31" fillcolor="#307C31">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">Reopen my quote</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">Reopen my quote</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 4px 0;">Cheers,</p>
<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'pdf_downloaded_followup';

UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelPerInch>96</o:PixelPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<!--[if mso]><style type="text/css">body,table,td{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;"><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
<!--<![endif]-->
<tr><td style="padding:24px;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#1f2937;">
<p style="margin:0 0 16px 0;">Hi {{first_name}},</p>
<p style="margin:0 0 16px 0;">I wanted to let you know personally - we have just made a pricing adjustment and your saved quote has dropped from <strong>{{old_price_formatted}}</strong> to <strong>{{new_price_formatted}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
<tr><td style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;text-align:center;font-size:18px;font-weight:600;color:#166534;">You save {{savings_formatted}}</td></tr>
</table>
<p style="margin:0 0 16px 0;">This reduced rate reflects current supplier pricing, which can change without notice. Your new price is locked in for now and ready whenever you are.</p>
<p style="margin:0 0 16px 0;">If you have been waiting for the right time to move forward, this might be it.</p>
<p style="margin:0 0 24px 0;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resume_url}}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="14%" strokecolor="#003751" fillcolor="#003751">
<w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;">View my updated quote</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{resume_url}}" style="display:inline-block;background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:700;">View my updated quote</a>
<!--<![endif]-->
</p>
<p style="margin:0 0 16px 0;">Any questions at all, just reply to this email and I will get back to you.</p>
<p style="margin:32px 0 0 0;">Cheers,<br/>{{sender_first_name}}<br/>Shade Systems Global</p>
</td></tr>
<!--[if mso]></table><![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->
</td></tr></table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'price_drop_notification';
