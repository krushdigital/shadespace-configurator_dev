/*
  # Unify email template button colors to dark green

  1. Changes
    - Replace dark navy (#01312D) button backgrounds with dark green (#307C31) across all email_templates rows
    - This affects the primary CTA buttons such as "Access Your Configuration" and "Access Your Quote Online"
    - Keeps link colors and quote-reference colors (already #307C31) untouched

  2. Notes
    - Only modifies stored html_body content in the email_templates table
    - No schema changes, no new columns, no data loss
    - RLS policies remain unchanged
*/

UPDATE email_templates
SET html_body = REPLACE(
      REPLACE(html_body, 'background-color:#01312D;color:#ffffff', 'background-color:#307C31;color:#ffffff'),
      'background-color: #01312D; color: #ffffff', 'background-color: #307C31; color: #ffffff'
    ),
    updated_at = now()
WHERE html_body ILIKE '%#01312D%';
