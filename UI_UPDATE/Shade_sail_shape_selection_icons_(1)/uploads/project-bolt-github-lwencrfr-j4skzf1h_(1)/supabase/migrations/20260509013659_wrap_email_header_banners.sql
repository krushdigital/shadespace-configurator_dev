/*
  # Wrap email header banners with strip markers

  Wraps the dark hero banner <tr> block in non-transactional step templates with
  HTML comment markers so the send-email function can strip the branded header
  when a template has include_header=false.

  Uses simple string functions to locate the exact opening signature and the
  next </td></tr> boundary that follows it. Idempotent: only updates rows
  that don't already contain HEADER_BANNER_START.
*/

DO $$
DECLARE
  r RECORD;
  open_sig text := '<tr><td style="padding:28px 32px;background:#0f3d2e;color:#fff';
  body text;
  start_pos int;
  end_pos int;
  close_sig text := '</td></tr>';
  new_body text;
BEGIN
  FOR r IN
    SELECT id, html_body FROM email_templates
    WHERE transactional = false
      AND html_body NOT LIKE '%HEADER_BANNER_START%'
      AND html_body LIKE '%' || open_sig || '%'
  LOOP
    body := r.html_body;
    start_pos := position(open_sig in body);
    end_pos := position(close_sig in substring(body from start_pos));
    IF start_pos > 0 AND end_pos > 0 THEN
      end_pos := start_pos + end_pos + length(close_sig) - 1;
      new_body := substring(body from 1 for start_pos - 1)
        || '<!-- HEADER_BANNER_START -->'
        || substring(body from start_pos for end_pos - start_pos + 1)
        || '<!-- HEADER_BANNER_END -->'
        || substring(body from end_pos + 1);
      UPDATE email_templates SET html_body = new_body WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
