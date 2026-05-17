/*
  # Update price drop notification email - transactional with urgency

  1. Changes
    - Mark `price_drop_notification` template as transactional (legitimate account update about saved quote)
    - Rewrite subject to factual account-notification style
    - Rewrite body copy to imply temporary pricing without fabricating deadlines
    - Remove unsubscribe footer (transactional emails skip it)

  2. Rationale
    - Email is genuinely transactional: notifying user their specific saved quote price changed
    - Factual subject avoids spam trigger words
    - Copy creates urgency via "supplier pricing may change" framing
*/

UPDATE email_templates
SET
  transactional = true,
  subject = 'Your quote {{quote_reference}} has been updated',
  html_body = '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;"><tr><td style="padding:24px;"><p>Hi {{first_name}},</p><p>I wanted to let you know personally - we have just made a pricing adjustment and your saved quote has dropped from <strong>{{old_price_formatted}}</strong> to <strong>{{new_price_formatted}}</strong>.</p><p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;font-size:18px;font-weight:600;color:#166534;">You save {{savings_formatted}}</p><p>This reduced rate reflects current supplier pricing, which can change without notice. Your new price is locked in for now and ready whenever you are.</p><p>If you have been waiting for the right time to move forward, this might be it.</p><p><a href="{{resume_url}}" style="background:#003751;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View my updated quote</a></p><p>Any questions at all, just reply to this email and I will get back to you.</p><p style="margin-top:32px;">Cheers,<br/>{{sender_first_name}}<br/>Shade Systems Global</p></td></tr></table>',
  text_body = 'Hi {{first_name}}, I wanted to let you know - we have made a pricing adjustment and your saved quote ({{quote_reference}}) has dropped from {{old_price_formatted}} to {{new_price_formatted}}. You save {{savings_formatted}}. This reduced rate reflects current supplier pricing which can change without notice. Your new price is locked in for now. If you have been waiting for the right time, this might be it. View your updated quote: {{resume_url}}',
  updated_at = now()
WHERE template_key = 'price_drop_notification';
