/*
  # Remove Precise Measurements section from PDF quote delivery email

  1. Modified Tables
    - `email_templates`: Removes the "Precise measurements" section from the
      `pdf_quote_delivery` template since measurements are not rendering and
      customers can view them via the configuration link or PDF attachment

  2. Changes
    - Strips the entire Precise measurements HTML block (heading, divider,
      edge/diagonal/anchor measurement rows table) from the template body
*/

UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  E'<!-- Precise measurements -->\n<tr>\n<td style="padding:20px 36px 6px 36px;">\n<h2 style="color:#0f172a;margin:0 0 4px 0;font-size:17px;font-weight:800;">Precise measurements</h2>\n<!--[if mso]><table role="presentation" width="36" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr><td style="background-color:#BFF102;height:2px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table><![endif]-->\n<!--[if !mso]><!-->\n<div style="width:36px;height:2px;background-color:#BFF102;border-radius:2px;margin:0 0 14px 0;"></div>\n<!--<![endif]-->\n<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">\n{{{edge_measurements_rows}}}\n{{{diagonal_measurements_rows}}}\n{{{anchor_measurements_rows}}}\n</table>\n</td>\n</tr>\n\n',
  ''
)
WHERE template_key = 'pdf_quote_delivery'
  AND html_body LIKE '%Precise measurements%';
