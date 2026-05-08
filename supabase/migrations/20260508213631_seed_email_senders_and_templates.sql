/*
  # Seed default sender and step-specific templates

  Creates a default Shade Systems sender plus seven templates covering steps 1-6
  and a hot-lead review email. Copy is written to sound like a personal reply
  from the team, not a bulk marketing email.
*/

INSERT INTO email_senders (label, from_name, from_email, reply_to, signature_name, signature_phone, is_default, is_verified)
VALUES
  ('Nick R - Shade Systems', 'Nick from Shade Systems', 'hello@shadespace.com', 'hello@shadespace.com', 'Nick', '+64 21 000 000', true, false)
ON CONFLICT (from_email) DO NOTHING;

-- Helper: build a base HTML shell once, reused across seeds
DO $$
DECLARE
  sender_id uuid;
  base_html text;
BEGIN
  SELECT id INTO sender_id FROM email_senders WHERE from_email = 'hello@shadespace.com';

  base_html := '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;"><tr><td style="padding:24px;">__BODY__<p style="margin-top:32px;">Cheers,<br/>{{sender_first_name}}<br/>Shade Systems Global<br/>{{support_phone}}</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/><p style="font-size:12px;color:#6b7280;">You are receiving this because you started a shade sail configuration at shadespace.com. <a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a>.</p></td></tr></table>';

  INSERT INTO email_templates (template_key, name, description, subject, html_body, text_body, default_sender_id, is_active) VALUES
  (
    'step_1_dimensions_saved',
    'Step 1 saved - Dimensions help',
    'User saved after entering fixing points but before dimensions.',
    'Quick hand with your shade sail measurements, {{first_name}}?',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>I noticed you started a shade sail configuration at step one. No pressure at all - just wanted to let you know I am here if the measurements feel a bit fiddly.</p><p>The easiest way is to measure between your fixing points with a tape, or call out the distances to someone from the ground. Even rough numbers work to start.</p><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Pick up where you left off</a></p><p>If it is easier, reply to this email with your measurements and I will plug them in for you.</p>'
    ),
    'Hi {{first_name}},' || chr(10) || 'I noticed you started a shade sail configuration. Resume here: {{resume_url}}' || chr(10) || 'Reply to this email with your measurements and I will help.',
    sender_id, true
  ),
  (
    'step_2_corners_saved',
    'Step 2 saved - Corners',
    'User picked corners but has not confirmed fixing points.',
    'Picking the right number of corners for your sail',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>Saw you were choosing between corner counts for your shade sail. A few pointers that usually help:</p><ul><li>Three-cornered sails look great and are the cheapest to install.</li><li>Four-cornered sails cover more square metres for the money.</li><li>Five plus gets you shaped coverage over awkward spaces.</li></ul><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Continue your design</a></p><p>Not sure which to go with? Send me a photo of the space and I will suggest a layout.</p>'
    ),
    'Hi {{first_name}}, resume your design: {{resume_url}}. Send me a photo of the space and I will suggest a layout.',
    sender_id, true
  ),
  (
    'step_3_fixings_saved',
    'Step 3 saved - Fixing points',
    'User reached fixings step.',
    'Tips on fixing points for your {{corners}}-corner sail',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>Fixings are the part people usually ask me about most, so you are not alone. A quick rule of thumb for your {{corners}}-corner sail:</p><ul><li>Posts need to be concreted at least 600mm into the ground.</li><li>Existing walls and fascia can anchor one or two corners - we have eye plates for that.</li><li>Keep adjacent fixing heights slightly different so water runs off.</li></ul><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Jump back in</a></p>'
    ),
    'Hi {{first_name}}, resume: {{resume_url}}. Reply with a photo if you are not sure which fixing to use.',
    sender_id, true
  ),
  (
    'step_4_diagonals_help',
    'Step 4 saved - Diagonals measuring help',
    'User saved before providing diagonal measurements.',
    'How to measure the diagonals on your sail (60 second trick)',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>You are nearly there - just the diagonals to go. Diagonals are what stop your sail looking square on a plan but saggy in real life, so they matter.</p><p><strong>The trick:</strong> run a tape from corner A to the opposite corner (across the shape), then do the same for the other opposite pair. Two numbers, done.</p><p>If the space is large, two people with a laser distance meter is the fastest way. A phone AR measuring app works at a pinch.</p><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Resume and add diagonals</a></p><p>Stuck? Reply with the plan measurements you have and I will calculate the diagonals for you.</p>'
    ),
    'Hi {{first_name}}, diagonals tip: measure corner A to opposite corner, then the other pair. Resume: {{resume_url}}',
    sender_id, true
  ),
  (
    'step_5_fabric_picked',
    'Step 5 saved - Fabric picked, review pending',
    'User chose fabric and colour but has not reached review.',
    'You picked {{fabric_color}} - one step from a quote',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>Nice choice on {{fabric_color}} - it is a popular one and reads really well against most roofs.</p><p>You are literally one click from a full price, so if you have a minute to review the summary I can lock in your quote and email a PDF you can sit on for as long as you like.</p><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Review and get my price</a></p>'
    ),
    'Hi {{first_name}}, review and lock in your price: {{resume_url}}',
    sender_id, true
  ),
  (
    'step_6_hot_lead',
    'Step 6 Hot Lead - Quote ready',
    'User saved a completed quote at review step.',
    'Your {{quote_reference}} is ready when you are',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>Your quote <strong>{{quote_reference}}</strong> is saved and ready: <strong>{{price}} {{currency}}</strong> for the {{corners}}-corner {{fabric_type}} sail in {{fabric_color}}.</p><p>A couple of quick ways forward:</p><ul><li>Reply with any questions - I personally read these and get back within the business day.</li><li>Download the PDF to share with whoever else is deciding.</li><li>Add to cart when you are ready - the price is locked for 30 days.</li></ul><p><a href="{{pdf_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-right:8px;">Download PDF</a><a href="{{resume_url}}" style="background:#ffffff;color:#003751;border:1px solid #003751;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Open my quote</a></p>'
    ),
    'Hi {{first_name}}, quote {{quote_reference}} is saved at {{price}} {{currency}}. PDF: {{pdf_url}} Resume: {{resume_url}}',
    sender_id, true
  ),
  (
    'pdf_downloaded_followup',
    'PDF downloaded - 48 hour follow up',
    'User downloaded PDF but has not added to cart.',
    'Anything I can help clarify on your quote, {{first_name}}?',
    replace(base_html, '__BODY__',
      '<p>Hi {{first_name}},</p><p>I saw you downloaded the PDF for {{quote_reference}} a couple of days ago. Totally fine if you are still thinking - I just wanted to put my hand up and offer to answer anything the quote does not explain clearly.</p><p>Common questions I get at this stage:</p><ul><li>How long does installation take? (usually half a day for residential)</li><li>What is the wind rating? (varies by fabric - I can quote yours)</li><li>Can I see a real install nearby? (often yes, just ask)</li></ul><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reopen my quote</a></p>'
    ),
    'Hi {{first_name}}, happy to answer anything about your quote {{quote_reference}}. Resume: {{resume_url}}',
    sender_id, true
  )
  ON CONFLICT (template_key) DO NOTHING;
END $$;
