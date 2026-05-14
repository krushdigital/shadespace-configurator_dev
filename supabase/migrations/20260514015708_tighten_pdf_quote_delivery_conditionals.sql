/*
  # Tighten conditional rendering in pdf_quote_delivery email

  1. Changes
    - Wraps the "Quote reference" label and value in `{{#if quote_reference}}` so
      the label never renders without a value.
    - Wraps the entire "All-inclusive price to your door" green panel in
      `{{#if price_formatted}}` so the panel disappears when no price is
      available, instead of rendering the panel chrome with a missing number.

  2. Security
    - No schema or RLS changes; updates the html_body of one row.
*/

UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Quote reference</div>
<div style="color:#0f172a;font-size:17px;font-weight:800;margin-bottom:12px;">{{quote_reference}}</div>',
  '{{#if quote_reference}}<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Quote reference</div>
<div style="color:#0f172a;font-size:17px;font-weight:800;margin-bottom:12px;">{{quote_reference}}</div>{{/if}}'
)
WHERE template_key = 'pdf_quote_delivery';

UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '<tr>
<td style="padding:10px 36px 22px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#BFF102 0%,#aee000 100%);border-radius:14px;">
<tr>
<td style="padding:24px 24px;text-align:center;">
<p style="color:#01312D;margin:0 0 4px 0;font-size:14px;font-weight:700;letter-spacing:0.3px;">ALL-INCLUSIVE PRICE TO YOUR DOOR</p>
{{#if price_formatted}}<p style="color:#01312D;margin:0 0 10px 0;font-size:40px;font-weight:800;line-height:1;">{{price_formatted}}</p>{{/if}}
<p style="color:#01312D;margin:0;font-size:12.5px;line-height:1.9;">
&#10003; Express freight to your door included<br/>
&#10003; All taxes &amp; duties included<br/>
&#10003; No hidden costs or tariffs
</p>
</td>
</tr>
</table>
</td>
</tr>',
  '{{#if price_formatted}}<tr>
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
</tr>{{/if}}'
)
WHERE template_key = 'pdf_quote_delivery';
