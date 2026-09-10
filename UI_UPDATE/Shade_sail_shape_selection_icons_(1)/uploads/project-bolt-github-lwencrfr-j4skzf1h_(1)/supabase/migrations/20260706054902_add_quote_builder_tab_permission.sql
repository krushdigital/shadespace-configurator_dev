-- Add Quote Builder tab to the admin permissions system so it's configurable
-- in User Management. Allowed for admins by default, disabled for team members by default.
INSERT INTO admin_tab_permissions (tab_id, tab_label, allowed_for_admin, allowed_for_team_member)
VALUES ('quote-builder', 'Quote Builder', true, false)
ON CONFLICT (tab_id) DO NOTHING;
