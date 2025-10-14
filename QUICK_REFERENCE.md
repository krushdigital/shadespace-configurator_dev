# Quick Reference - Environment Variables for Developer

## Immediate Action Items

Your developer needs these environment variables to make the Save Quote modal work:

---

## 1. Frontend Variables (Copy to .env file)

```env
VITE_SUPABASE_URL=https://ylrijvwogytbclhcwevy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscmlqdndvZ3l0YmNsaGN3ZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTU4NzksImV4cCI6MjA3NTI5MTg3OX0.6XtWseKg9IBq8ir_fZywW8xsruUJr1Yddu_1eg0Gao4
```

**Status:** ✅ These values are correct and working

---

## 2. Supabase Edge Function Secrets (Configure in Supabase Dashboard)

**⚠️ THESE ARE MISSING - Primary cause of the issue**

Navigate to: Supabase Dashboard → Project Settings → Edge Functions → Secrets

Add these secrets:

```bash
SHOPIFY_SHOP_DOMAIN=<ask project owner>
SHOPIFY_ADMIN_API_TOKEN=<ask project owner>
SMTP_HOST=<ask project owner>
SMTP_PORT=<ask project owner>
SMTP_USER=<ask project owner>
SMTP_PASS=<ask project owner>
FROM_EMAIL=<ask project owner>
```

**Note:** The developer should request these values from you (the project owner) as they contain sensitive credentials.

---

## 3. Verify Edge Functions Are Deployed

Check that these 4 functions exist in Supabase:
- ✅ save-quote
- ✅ add-shopify-customer
- ✅ send-email-summary
- ✅ generate-pdf

**How to check:** Supabase Dashboard → Edge Functions section

If missing, deploy using:
```bash
supabase functions deploy
```

---

## 4. Verify Database Tables

Check that the `saved_quotes` table exists:
- **Location:** Supabase Dashboard → Table Editor → saved_quotes

If missing, apply migrations:
```bash
supabase db push
```

Or run the SQL files in `supabase/migrations/` manually.

---

## Why the Modal Isn't Opening

The Save Quote modal depends on:

1. ✅ **Frontend Code** - Modal state is correctly implemented (line 82 of ShadeConfigurator.tsx)
2. ✅ **Supabase Connection** - URL and Anon Key are set
3. ❌ **Edge Functions** - Need to be deployed
4. ❌ **Backend Secrets** - Need to be configured in Supabase
5. ❌ **Database Tables** - Need to exist

**Root Cause:** Missing Edge Function secrets and/or Edge Functions not deployed

---

## Testing Steps

After configuration:

1. Restart dev server: `npm run dev`
2. Navigate to the configurator
3. Complete configuration until Review step
4. Click "Save Quote" button
5. Modal should now open

If it still doesn't work, check browser console for specific error messages.

---

## Full Documentation

See `DEVELOPER_SETUP_GUIDE.md` for complete setup instructions and troubleshooting.

---

## Security Reminder

- **DO NOT** commit the .env file
- **DO NOT** share credentials in plain text (use secure channels)
- Rotate API keys regularly
