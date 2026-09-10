/*
  # Add paused audit fields to email_templates and email_automations

  1. Changes
    - email_templates: add paused_at (timestamptz, nullable) and paused_by (uuid, nullable, references auth.users)
    - email_automations: add paused_at (timestamptz, nullable) and paused_by (uuid, nullable, references auth.users)
  2. Notes
    - Used to audit who paused an email automation/template and when
    - Existing `is_active` boolean remains the source of truth for whether sends are blocked
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_templates' AND column_name='paused_at') THEN
    ALTER TABLE email_templates ADD COLUMN paused_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_templates' AND column_name='paused_by') THEN
    ALTER TABLE email_templates ADD COLUMN paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_automations' AND column_name='paused_at') THEN
    ALTER TABLE email_automations ADD COLUMN paused_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_automations' AND column_name='paused_by') THEN
    ALTER TABLE email_automations ADD COLUMN paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
