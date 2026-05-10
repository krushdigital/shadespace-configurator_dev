/*
  # Rewrite non-transactional email templates and unify default sender

  1. Changes
    - Sets default_sender_id to the sails@shadespace.com sender row for every
      non-transactional template (step_*, pdf_downloaded_followup, step_6_hot_lead)
    - Rewrites subject, html_body, and text_body for each of those templates with
      shorter, more personal, conversational copy
    - Adds breathing room between greeting and body (each <p> uses
      margin:0 0 16px 0 so there is a consistent line-space)
    - Uses only facts from shadespace.com (10-15 year warranty, up to 98% UV,
      ExtraBlock 330 / Monotec 370 / ShadeTec 320 fabrics, free DHL Express
      worldwide with taxes and duties included, 20+ years family-owned)
    - Buttons use the dark green #307C31 brand colour
    - configuration_saved and pdf_quote_delivery templates are NOT touched

  2. Security
    - No schema changes, no RLS changes
    - Only UPDATE statements against email_templates
*/

DO $$
DECLARE
  default_sender_uuid uuid;
  shell_open text;
  shell_close text;
  body_row_open text;
  btn_style text;
BEGIN
  SELECT id INTO default_sender_uuid
  FROM email_senders
  WHERE from_email = 'sails@shadespace.com'
  ORDER BY is_default DESC NULLS LAST
  LIMIT 1;

  IF default_sender_uuid IS NULL THEN
    RAISE EXCEPTION 'Could not find sender with from_email sails@shadespace.com';
  END IF;

  shell_open := '<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">'
    || '<tr><td align="center">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">'
    || '<tr><td style="padding:32px 32px 8px 32px;font-size:15px;line-height:1.6;color:#1f2937;">';

  shell_close := '</td></tr></table></td></tr></table></body></html>';

  btn_style := 'display:inline-block;background-color:#307C31;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;';

  -- step_0_fabric_saved
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = 'Great pick on your fabric, {{first_name}}',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">Nice choice saving {{fabric_type}} in {{fabric_color}} for your sail.</p>'
      || '<p style="margin:0 0 16px 0;">All of our fabrics (ExtraBlock 330, Monotec 370 and ShadeTec 320) block up to 98&#37; of UV and are built for tough sun, wind and coastal climates.</p>'
      || '<p style="margin:0 0 24px 0;">Want to keep going?</p>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Continue my design</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'Nice choice saving {{fabric_type}} in {{fabric_color}} for your sail.' || chr(10) || chr(10)
      || 'All of our fabrics block up to 98% of UV and are built for tough sun, wind and coastal climates.' || chr(10) || chr(10)
      || 'Continue your design: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'step_0_fabric_saved';

  -- step_1_style_saved
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = 'Your edge style is locked in, {{first_name}}',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">Good call saving your edge style.</p>'
      || '<p style="margin:0 0 16px 0;">We custom-cut every sail to your exact measurements, so the edges you choose carry through to a sail that fits right the first time.</p>'
      || '<p style="margin:0 0 24px 0;">Ready to add your corners?</p>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Keep designing</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'Good call saving your edge style. Keep designing: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'step_1_style_saved';

  -- step_2_corners_saved
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = '{{corners}} corners saved - looking good, {{first_name}}',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">You went with {{corners}} corners - nice.</p>'
      || '<p style="margin:0 0 16px 0;">We can make any shape or size, so whatever corner count fits your space, we will cut it to match.</p>'
      || '<p style="margin:0 0 24px 0;">Let us get your measurements in.</p>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Keep designing</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'You went with {{corners}} corners - nice. Let us get your measurements in: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'step_2_corners_saved';

  -- step_3_measurement_saved
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = 'Measurements saved, {{first_name}}',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">Your measurements are saved.</p>'
      || '<p style="margin:0 0 16px 0;">Our configurator guides you through every step, so if anything feels unclear, reply and we will help.</p>'
      || '<p style="margin:0 0 24px 0;">Ready for dimensions?</p>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Continue to dimensions</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'Your measurements are saved. Continue to dimensions: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'step_3_measurement_saved';

  -- step_4_dimensions_saved
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = 'Dimensions in - nearly there, {{first_name}}',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">Your dimensions are saved.</p>'
      || '<p style="margin:0 0 16px 0;">Because we custom-cut every sail, getting these right means yours will fit perfectly the first time - no &ldquo;close enough&rdquo;.</p>'
      || '<p style="margin:0 0 24px 0;">Reply any time with a sketch or photo and we will sanity-check it for you.</p>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Continue to heights</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'Your dimensions are saved. Continue to heights: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'step_4_dimensions_saved';

  -- step_5_heights_saved
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = 'Heights saved, {{first_name}} - ready to review',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">Nice work - your anchor heights are locked in.</p>'
      || '<p style="margin:0 0 16px 0;">One last step and you will see your price, shipped free by express worldwide with taxes and duties included.</p>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Review my quote</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'Nice work - your heights are locked in. Review your quote: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'step_5_heights_saved';

  -- step_6_hot_lead
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = 'Your sail is ready when you are, {{first_name}}',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">Your quote <strong>{{quote_reference}}</strong> is saved and ready.</p>'
      || '<p style="margin:0 0 16px 0;">Price is locked for 30 days - includes free DHL Express shipping worldwide with taxes and duties covered, plus our 10-15 year fabric and workmanship warranty.</p>'
      || '<p style="margin:0 0 24px 0;">Reply any time with questions, or jump back in below.</p>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Open my quote</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'Your quote {{quote_reference}} is saved and ready. Price is locked for 30 days.' || chr(10) || chr(10)
      || 'Open it here: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'step_6_hot_lead';

  -- pdf_downloaded_followup
  UPDATE email_templates SET
    default_sender_id = default_sender_uuid,
    subject = 'Anything I can help with on your quote, {{first_name}}?',
    html_body = shell_open
      || '<p style="margin:0 0 20px 0;">Hi {{first_name}},</p>'
      || '<p style="margin:0 0 16px 0;">Saw you grabbed the PDF for <strong>{{quote_reference}}</strong> - happy to answer anything it does not cover.</p>'
      || '<p style="margin:0 0 16px 0;">Common questions we get:</p>'
      || '<ul style="margin:0 0 20px 20px;padding:0;color:#334155;">'
      || '<li style="margin:0 0 8px 0;">How long will it last? 10-15 year fabric and workmanship warranty.</li>'
      || '<li style="margin:0 0 8px 0;">Where does it ship? Free DHL Express worldwide, taxes and duties included.</li>'
      || '<li style="margin:0 0 8px 0;">What about UV? Our fabrics block up to 98&#37;.</li>'
      || '</ul>'
      || '<p style="margin:0 0 28px 0;"><a href="{{resume_url}}" style="' || btn_style || '">Reopen my quote</a></p>'
      || '<p style="margin:0 0 4px 0;">Cheers,</p>'
      || '<p style="margin:0 0 4px 0;">{{sender_first_name}}</p>'
      || '<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;">ShadeSpace</p>'
      || shell_close,
    text_body = 'Hi {{first_name}},' || chr(10) || chr(10)
      || 'Saw you grabbed the PDF for {{quote_reference}} - happy to answer anything it does not cover.' || chr(10) || chr(10)
      || 'Reopen your quote: {{resume_url}}' || chr(10) || chr(10)
      || 'Cheers,' || chr(10) || '{{sender_first_name}}' || chr(10) || 'ShadeSpace',
    updated_at = now()
  WHERE template_key = 'pdf_downloaded_followup';

END $$;
