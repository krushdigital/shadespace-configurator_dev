/*
  # Add Corner Hardware section to customer email template

  1. Changes
    - Updates the `pdf_quote_delivery` email template body to include the
      `{{{corner_hardware_html}}}` merge tag, rendered after the precise/diagonal/anchor
      measurements sections. The merge tag is provided by the
      `send-config-email` edge function and contains a styled HTML block listing the
      hardware selected for each corner.

  2. Security
    - No schema or RLS changes; only updates the html_body of an existing row.
*/

UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '{{#if anchor_measurements_html}}<tr><td>{{{anchor_measurements_html}}}</td></tr>{{/if}}',
  '{{#if anchor_measurements_html}}<tr><td>{{{anchor_measurements_html}}}</td></tr>{{/if}}
    {{#if corner_hardware_html}}<tr><td>{{{corner_hardware_html}}}</td></tr>{{/if}}'
)
WHERE template_key = 'pdf_quote_delivery'
  AND html_body LIKE '%anchor_measurements_html%'
  AND html_body NOT LIKE '%corner_hardware_html%';
