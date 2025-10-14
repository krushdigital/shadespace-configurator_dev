# ShadeSpace Configurator - Developer Setup Guide

## Issue Resolution: Save Quote Modal Not Opening

The Save Quote modal state is correctly implemented in the code. The issue is related to **missing environment variables** required for the configurator to function properly.

---

## Required Environment Variables

### 1. Frontend Environment Variables (.env file)

These variables are used by the React/Vite frontend and must be prefixed with `VITE_`:

```env
VITE_SUPABASE_URL=https://ylrijvwogytbclhcwevy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscmlqdndvZ3l0YmNsaGN3ZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTU4NzksImV4cCI6MjA3NTI5MTg3OX0.6XtWseKg9IBq8ir_fZywW8xsruUJr1Yddu_1eg0Gao4
```

**Status:** ✅ These are already set in your .env file

---

### 2. Supabase Edge Functions Secrets (Backend Configuration)

These secrets need to be configured in the Supabase dashboard or via CLI. They are NOT stored in the .env file.

**How to Configure:**
- **Option A:** Via Supabase Dashboard → Project Settings → Edge Functions → Secrets
- **Option B:** Via Supabase CLI: `supabase secrets set VARIABLE_NAME=value`

**Required Secrets:**

```bash
# Shopify Integration (Required for customer creation)
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=shpat_your_admin_api_token_here

# Email Configuration (Required for sending quote summaries)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
FROM_EMAIL=sails@shadespace.com
```

**Note:** These values should be obtained from the project owner. Do NOT commit these to version control.

---

## Supabase Edge Functions Verification

The configurator uses 4 Supabase Edge Functions. Verify they are deployed:

### Check Deployment Status

**Option A:** Via Supabase Dashboard
- Navigate to: Edge Functions section
- Verify all 4 functions are listed and active

**Option B:** Via Supabase CLI
```bash
supabase functions list
```

### Required Edge Functions

1. **save-quote** - Handles quote saving and retrieval
   - Location: `supabase/functions/save-quote/index.ts`
   - Purpose: Saves customer quotes to the database

2. **add-shopify-customer** - Creates/updates Shopify customers
   - Location: `supabase/functions/add-shopify-customer/index.ts`
   - Purpose: Syncs quote customers to Shopify

3. **send-email-summary** - Sends quote summary emails
   - Location: `supabase/functions/send-email-summary/index.ts`
   - Purpose: Emails quote details to customers

4. **generate-pdf** - Generates PDF quote documents
   - Location: `supabase/functions/generate-pdf/index.ts`
   - Purpose: Creates downloadable quote PDFs

### Deploy Edge Functions (If Missing)

If any functions are missing, deploy them using:

```bash
# Deploy individual function
supabase functions deploy save-quote
supabase functions deploy add-shopify-customer
supabase functions deploy send-email-summary
supabase functions deploy generate-pdf

# Or deploy all at once
supabase functions deploy
```

---

## Database Setup Verification

### Required Tables

The database should have these tables:

1. **saved_quotes** - Stores customer quote configurations
   - Migration: `20251013204352_create_saved_quotes_table.sql`
   - Columns: id, quote_reference, customer_email, config_data, calculations_data, etc.

2. **Shopify customer tracking fields** - Extends saved_quotes table
   - Migration: `20251014001500_add_shopify_customer_tracking.sql`
   - Adds: shopify_customer_id, shopify_customer_created columns

### Verify Tables Exist

**Option A:** Via Supabase Dashboard
- Navigate to: Table Editor
- Check for `saved_quotes` table

**Option B:** Via SQL Editor
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'saved_quotes';
```

### Apply Migrations (If Missing)

If tables don't exist, apply the migrations:

```bash
# Via Supabase CLI
supabase db push

# Or apply manually via SQL Editor in Supabase Dashboard
# Run the contents of each migration file in order
```

### Required Database Functions

Verify the `generate_quote_reference()` function exists:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'generate_quote_reference';
```

---

## Shopify App Configuration

The configurator integrates with Shopify to create customer records. Verify your Shopify app has the required permissions:

### Required API Scopes

- `read_customers` - Read customer data
- `write_customers` - Create/update customer records

### How to Verify/Update Scopes

1. Log into your Shopify Admin panel
2. Go to: **Settings → Apps and sales channels → Develop apps**
3. Select your app
4. Click **Configuration**
5. Under **Admin API access scopes**, verify both scopes are enabled
6. If not enabled, add them and reinstall the app

### Get Admin API Token

If you don't have the token:
1. In your Shopify app settings, go to **API credentials**
2. Copy the **Admin API access token** (starts with `shpat_`)
3. Use this value for `SHOPIFY_ADMIN_API_TOKEN`

---

## Email Configuration (SMTP)

The configurator sends quote summaries via email. Configure your SMTP provider:

### Gmail Configuration Example

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password  # NOT your regular password
FROM_EMAIL=your-email@gmail.com
```

**Note:** For Gmail, you must:
- Enable 2-Factor Authentication
- Generate an App-Specific Password (don't use your regular password)

### SendGrid Configuration Example

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=sails@shadespace.com
```

### Mailgun Configuration Example

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
FROM_EMAIL=sails@shadespace.com
```

---

## Troubleshooting Checklist

Use this checklist to verify each component:

### ✅ Frontend Environment Variables
- [ ] `.env` file exists in project root
- [ ] `VITE_SUPABASE_URL` is set
- [ ] `VITE_SUPABASE_ANON_KEY` is set
- [ ] Both values match your Supabase project

### ✅ Supabase Edge Functions
- [ ] All 4 functions are deployed (save-quote, add-shopify-customer, send-email-summary, generate-pdf)
- [ ] Functions are accessible (test by visiting function URL)
- [ ] Function logs show no errors (check in Supabase Dashboard)

### ✅ Supabase Secrets
- [ ] `SHOPIFY_SHOP_DOMAIN` is configured
- [ ] `SHOPIFY_ADMIN_API_TOKEN` is configured
- [ ] `SMTP_HOST` is configured
- [ ] `SMTP_PORT` is configured
- [ ] `SMTP_USER` is configured
- [ ] `SMTP_PASS` is configured
- [ ] `FROM_EMAIL` is configured

### ✅ Database Setup
- [ ] `saved_quotes` table exists
- [ ] Shopify tracking columns exist
- [ ] `generate_quote_reference()` function exists
- [ ] RLS policies are configured

### ✅ Shopify Integration
- [ ] Shopify app has `read_customers` scope
- [ ] Shopify app has `write_customers` scope
- [ ] Admin API token is valid
- [ ] Shop domain is correct (yourstore.myshopify.com format)

### ✅ Email Configuration
- [ ] SMTP credentials are valid
- [ ] FROM_EMAIL is authorized to send
- [ ] Test email can be sent successfully

---

## Testing the Save Quote Functionality

Once all configuration is complete, test the Save Quote feature:

1. **Navigate to the configurator**
   - Complete the configuration steps until you reach the Review step
   - A price should be calculated and displayed

2. **Test Save Quote Modal**
   - Click the "Save Quote" button
   - The modal should open (if it doesn't, check browser console for errors)
   - Choose "Save with Email" or "Get Quote Link"
   - Complete the save process

3. **Verify Backend**
   - Check Supabase Dashboard → Table Editor → saved_quotes
   - A new record should appear
   - Check Edge Functions logs for any errors

4. **Test Email (if configured)**
   - Save a quote with email
   - Verify email is received
   - Check email contains quote details and PDF attachment

---

## Common Issues & Solutions

### Issue: Save Quote Modal Not Opening
**Cause:** Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`
**Solution:** Verify both variables are set in `.env` file and restart dev server

### Issue: "Failed to save quote" Error
**Cause:** Edge function not deployed or Supabase secrets not configured
**Solution:** Deploy `save-quote` function and configure all required secrets

### Issue: Shopify Customer Not Created
**Cause:** Invalid `SHOPIFY_SHOP_DOMAIN` or `SHOPIFY_ADMIN_API_TOKEN`
**Solution:** Verify token is valid and has correct scopes

### Issue: Emails Not Sending
**Cause:** Invalid SMTP credentials
**Solution:** Test SMTP connection separately, verify credentials are correct

### Issue: Database Errors
**Cause:** Migrations not applied
**Solution:** Run `supabase db push` or apply migrations manually

---

## Development Workflow

1. **Local Development**
   ```bash
   npm install
   npm run dev
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

3. **Deploy Edge Functions** (when changes are made)
   ```bash
   supabase functions deploy
   ```

4. **Apply Database Changes**
   ```bash
   supabase db push
   ```

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **Shopify API Docs:** https://shopify.dev/docs/api/admin-rest
- **Edge Functions Guide:** https://supabase.com/docs/guides/functions
- **Database Migrations:** https://supabase.com/docs/guides/cli/local-development#database-migrations

---

## Security Notes

- **NEVER** commit the `.env` file to version control
- Store sensitive credentials securely (use a password manager)
- Rotate API keys and tokens regularly
- Use environment-specific values for dev/staging/production
- Follow principle of least privilege for API scopes

---

## Next Steps After Setup

1. Test all configurator steps end-to-end
2. Verify quote saving works correctly
3. Test email sending functionality
4. Confirm Shopify customer creation
5. Test quote retrieval by reference number
6. Verify PDF generation works
7. Test the full integration in the Shopify app environment

---

## Questions?

If you encounter issues not covered in this guide:
1. Check the browser console for error messages
2. Review Supabase Edge Function logs
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied
5. Contact the project owner for additional credentials

---

**Last Updated:** 2025-10-14
**Version:** 1.0
