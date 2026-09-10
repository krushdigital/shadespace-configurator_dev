/*
  # Seed default automations linking triggers to step templates
*/

DO $$
DECLARE
  v_sender uuid;
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_t4 uuid; v_t5 uuid; v_t6 uuid; v_pdf uuid;
BEGIN
  SELECT id INTO v_sender FROM email_senders WHERE is_default = true LIMIT 1;

  SELECT id INTO v_t1 FROM email_templates WHERE template_key='step_1_dimensions_saved';
  SELECT id INTO v_t2 FROM email_templates WHERE template_key='step_2_corners_saved';
  SELECT id INTO v_t3 FROM email_templates WHERE template_key='step_3_fixings_saved';
  SELECT id INTO v_t4 FROM email_templates WHERE template_key='step_4_diagonals_help';
  SELECT id INTO v_t5 FROM email_templates WHERE template_key='step_5_fabric_picked';
  SELECT id INTO v_t6 FROM email_templates WHERE template_key='step_6_hot_lead';
  SELECT id INTO v_pdf FROM email_templates WHERE template_key='pdf_downloaded_followup';

  INSERT INTO email_automations (name, description, is_active, trigger_type, trigger_config, delay_minutes, template_id, sender_id, max_sends_per_quote)
  VALUES
    ('Step 1 saved - nudge', 'Sends 2h after save at step 1', false, 'quote_reached_step', '{"step":0,"status":"in_progress"}'::jsonb, 120, v_t1, v_sender, 1),
    ('Step 2 saved - corners', 'Sends 6h after save at step 2', false, 'quote_reached_step', '{"step":1,"status":"in_progress"}'::jsonb, 360, v_t2, v_sender, 1),
    ('Step 3 saved - fixings', 'Sends 12h after save at step 3', false, 'quote_reached_step', '{"step":2,"status":"in_progress"}'::jsonb, 720, v_t3, v_sender, 1),
    ('Step 4 saved - diagonals help', 'Sends 6h after save at step 4', false, 'quote_reached_step', '{"step":3,"status":"in_progress"}'::jsonb, 360, v_t4, v_sender, 1),
    ('Step 5 saved - fabric review', 'Sends 24h after save at step 5', false, 'quote_reached_step', '{"step":4,"status":"in_progress"}'::jsonb, 1440, v_t5, v_sender, 1),
    ('Step 6 Hot Lead - quote ready', 'Sends 30 min after quote_ready save', false, 'quote_reached_step', '{"step":6,"status":"quote_ready"}'::jsonb, 30, v_t6, v_sender, 1),
    ('PDF downloaded - 48h follow up', 'Sends 48h after pdf_download event if no add_to_cart', false, 'pdf_downloaded', '{"hours_since":48}'::jsonb, 2880, v_pdf, v_sender, 1)
  ON CONFLICT DO NOTHING;
END $$;
