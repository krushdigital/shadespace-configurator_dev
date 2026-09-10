/*
  # Reseed step-save email templates + automations (v2)
  Uses actual email_templates columns. Aligns template_keys and automations to
  real configurator step indices (0..6) and activates all automations.
*/

UPDATE email_templates SET
  template_key = 'step_0_fabric_saved',
  name = 'Step 0 saved - Fabric & Colour',
  subject = 'Nice choice - let''s make sure {{fabric_color}} is right for your space',
  html_body = '<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff"><div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.8">Shade Systems</div><div style="font-size:22px;font-weight:700;margin-top:4px">You''ve picked your fabric</div></td></tr><tr><td style="padding:28px 32px;font-size:15px;line-height:1.55"><p>Hi {{first_name}},</p><p>Good call on saving your fabric selection - {{fabric_type}} in {{fabric_color}} is a popular choice.</p><p>A couple of things we often get asked:</p><ul><li>How does it fade? Our fabrics are UV-stabilised and warrantied against significant fade.</li><li>Want to see the colour in person? We can send a free fabric sample anywhere in NZ/AU.</li></ul><p style="text-align:center;margin:28px 0"><a href="{{resume_url}}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Continue your design</a></p><p>- {{sender_first_name}}</p></td></tr><tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}" style="color:#6b7280">Unsubscribe</a></td></tr></table></td></tr></table></body></html>',
  text_body = 'Hi {{first_name}}, nice choice on {{fabric_type}} in {{fabric_color}}. Continue: {{resume_url}} - {{sender_first_name}}'
WHERE template_key = 'step_1_dimensions_saved';

UPDATE email_templates SET
  template_key = 'step_1_style_saved',
  name = 'Step 1 saved - Edge style',
  subject = 'Webbing vs cable edges - which is right for your sail?',
  html_body = '<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff"><div style="font-size:22px;font-weight:700">Picking the right edge</div></td></tr><tr><td style="padding:28px 32px;font-size:15px;line-height:1.55"><p>Hi {{first_name}},</p><p>You''ve locked in an edge style. Cheat-sheet:</p><ul><li><strong>Reinforced webbing</strong> - tidy look, great for residential shade up to ~25 sqm.</li><li><strong>Steel cable</strong> - stronger tension, best for larger sails or windy sites.</li></ul><p style="text-align:center;margin:28px 0"><a href="{{resume_url}}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Keep going</a></p><p>- {{sender_first_name}}</p></td></tr><tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}" style="color:#6b7280">Unsubscribe</a></td></tr></table></td></tr></table></body></html>',
  text_body = 'Webbing vs cable edges. Keep going: {{resume_url}} - {{sender_first_name}}'
WHERE template_key = 'step_2_corners_saved';

UPDATE email_templates SET
  template_key = 'step_2_corners_saved',
  name = 'Step 2 saved - Corners',
  subject = 'Picking the right number of corners for your sail',
  html_body = '<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff"><div style="font-size:22px;font-weight:700">About {{corners}}-corner sails</div></td></tr><tr><td style="padding:28px 32px;font-size:15px;line-height:1.55"><p>Hi {{first_name}},</p><p>You went with {{corners}} corners. Notes:</p><ul><li>3-corner sails are easier to tension and cheaper, but cover less area.</li><li>4-corner sails cover more ground for the same price point.</li><li>5 &amp; 6-corner sails hug unusual spaces but need more fixings.</li></ul><p style="text-align:center;margin:28px 0"><a href="{{resume_url}}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Keep going</a></p><p>- {{sender_first_name}}</p></td></tr><tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}" style="color:#6b7280">Unsubscribe</a></td></tr></table></td></tr></table></body></html>',
  text_body = 'You picked {{corners}} corners. Keep going: {{resume_url}} - {{sender_first_name}}'
WHERE template_key = 'step_3_fixings_saved';

UPDATE email_templates SET
  template_key = 'step_3_measurement_saved',
  name = 'Step 3 saved - Measurement options',
  subject = 'Metric or imperial, auto or manual - quick tips',
  html_body = '<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff"><div style="font-size:22px;font-weight:700">Measuring made easy</div></td></tr><tr><td style="padding:28px 32px;font-size:15px;line-height:1.55"><p>Hi {{first_name}},</p><p>Your preferences are saved. Tips:</p><ul><li><strong>Auto shape</strong> fits the cleanest geometry to your edge lengths.</li><li><strong>Manual shape</strong> lets you drag corners for odd-shaped spaces.</li><li>Always measure straight-line distances.</li></ul><p style="text-align:center;margin:28px 0"><a href="{{resume_url}}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Continue to dimensions</a></p><p>- {{sender_first_name}}</p></td></tr><tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}" style="color:#6b7280">Unsubscribe</a></td></tr></table></td></tr></table></body></html>',
  text_body = 'Tips for metric vs imperial & auto vs manual shape. Continue: {{resume_url}} - {{sender_first_name}}'
WHERE template_key = 'step_4_diagonals_help';

UPDATE email_templates SET
  template_key = 'step_4_dimensions_saved',
  name = 'Step 4 saved - Dimensions',
  subject = 'Quick hand with your shade sail measurements, {{first_name}}?',
  html_body = '<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff"><div style="font-size:22px;font-weight:700">Double-checking your dimensions</div></td></tr><tr><td style="padding:28px 32px;font-size:15px;line-height:1.55"><p>Hi {{first_name}},</p><p>You''ve saved your dimensions. Most-missed tip: also note the <strong>diagonal measurement</strong> between opposite corners - it protects you from a shape that looks right on paper but won''t fit on-site.</p><p>Reply with a sketch or photo and I''ll sanity check for you.</p><p style="text-align:center;margin:28px 0"><a href="{{resume_url}}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Continue to heights</a></p><p>- {{sender_first_name}}</p></td></tr><tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}" style="color:#6b7280">Unsubscribe</a></td></tr></table></td></tr></table></body></html>',
  text_body = 'Tip: measure diagonals too. Continue: {{resume_url}} - {{sender_first_name}}'
WHERE template_key = 'step_5_fabric_picked';

INSERT INTO email_templates (template_key, name, subject, html_body, text_body, default_sender_id, is_active)
SELECT 'step_5_heights_saved', 'Step 5 saved - Heights & Anchor Points',
  'Getting your post heights and slope right',
  '<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff"><div style="font-size:22px;font-weight:700">Heights, slope and drainage</div></td></tr><tr><td style="padding:28px 32px;font-size:15px;line-height:1.55"><p>Hi {{first_name}},</p><p>You''ve set your anchor heights. A few pro tips:</p><ul><li>Aim for at least <strong>300mm of drop</strong> between your highest and lowest corner so rain sheds.</li><li>Keep <strong>2.1m clearance</strong> under the lowest point for head-room.</li><li>Posts should be concreted to at least 1/3 of their above-ground height.</li></ul><p style="text-align:center;margin:28px 0"><a href="{{resume_url}}" style="background:#0f3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Review your quote</a></p><p>- {{sender_first_name}}</p></td></tr><tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280"><a href="{{unsubscribe_url}}" style="color:#6b7280">Unsubscribe</a></td></tr></table></td></tr></table></body></html>',
  'Heights, slope and drainage tips. Review: {{resume_url}} - {{sender_first_name}}',
  (SELECT id FROM email_senders LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_key = 'step_5_heights_saved');

-- Automations
UPDATE email_automations SET
  trigger_config = jsonb_build_object('step', 0, 'status', 'in_progress'),
  delay_minutes = 240,
  template_id = (SELECT id FROM email_templates WHERE template_key = 'step_0_fabric_saved'),
  is_active = true,
  name = 'Step 0 saved - Fabric & Colour'
WHERE name = 'Step 1 saved - nudge';

UPDATE email_automations SET
  trigger_config = jsonb_build_object('step', 1, 'status', 'in_progress'),
  delay_minutes = 360,
  template_id = (SELECT id FROM email_templates WHERE template_key = 'step_1_style_saved'),
  is_active = true,
  name = 'Step 1 saved - Style'
WHERE name = 'Step 2 saved - corners';

UPDATE email_automations SET
  trigger_config = jsonb_build_object('step', 2, 'status', 'in_progress'),
  delay_minutes = 720,
  template_id = (SELECT id FROM email_templates WHERE template_key = 'step_2_corners_saved'),
  is_active = true,
  name = 'Step 2 saved - Corners'
WHERE name = 'Step 3 saved - fixings';

UPDATE email_automations SET
  trigger_config = jsonb_build_object('step', 3, 'status', 'in_progress'),
  delay_minutes = 360,
  template_id = (SELECT id FROM email_templates WHERE template_key = 'step_3_measurement_saved'),
  is_active = true,
  name = 'Step 3 saved - Measurement options'
WHERE name = 'Step 4 saved - diagonals help';

UPDATE email_automations SET
  trigger_config = jsonb_build_object('step', 4, 'status', 'in_progress'),
  delay_minutes = 360,
  template_id = (SELECT id FROM email_templates WHERE template_key = 'step_4_dimensions_saved'),
  is_active = true,
  name = 'Step 4 saved - Dimensions'
WHERE name = 'Step 5 saved - fabric review';

INSERT INTO email_automations (name, trigger_type, trigger_config, delay_minutes, template_id, is_active)
SELECT 'Step 5 saved - Heights & Anchor Points', 'quote_reached_step',
  jsonb_build_object('step', 5, 'status', 'in_progress'), 720,
  (SELECT id FROM email_templates WHERE template_key = 'step_5_heights_saved'),
  true
WHERE NOT EXISTS (SELECT 1 FROM email_automations WHERE name = 'Step 5 saved - Heights & Anchor Points');

UPDATE email_automations SET
  trigger_config = jsonb_build_object('step', 6, 'status', 'quote_ready'),
  delay_minutes = 30,
  template_id = (SELECT id FROM email_templates WHERE template_key = 'step_6_hot_lead'),
  is_active = true
WHERE name = 'Step 6 Hot Lead - quote ready';

UPDATE email_automations SET is_active = true WHERE name = 'PDF downloaded - 48h follow up';
