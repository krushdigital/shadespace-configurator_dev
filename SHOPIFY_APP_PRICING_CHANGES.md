# Shopify App Developer Guide: Database-Driven Pricing Changes

**Date:** 18 March 2026
**For:** Shopify App Developer
**System:** ShadeSpace Configurator Pricing System

---

## Overview of Changes

The ShadeSpace configurator has been updated to use **database-driven pricing** instead of hardcoded currency markups and exchange rates. This document explains what changed, what impacts the Shopify app, and what (if anything) needs to be updated on the Shopify side.

---

## What Changed in the Configurator

### Before (Old System)
- Currency markups and exchange rates were hardcoded in `src/data/pricing.ts`
- A single "currency markup" value per currency combined market margins + shipping costs
- Changing any price required a code deployment

### After (New System)
- Currency pricing settings are stored in a **Supabase database table** (`pricing_settings`)
- Three separate multipliers per currency:
  1. **Market Markup** -- Business margin per market
  2. **Zonos/DHL Markup** -- Shipping, duties, tariffs per region
  3. **Exchange Rate** -- NZD to foreign currency conversion
- Admin dashboard has a new **"Pricing" tab** for managing these values
- All changes are logged in a `pricing_history` audit table

### New Pricing Calculation Flow
```
Base NZD Price (fabric + corners + hardware)
    |
    v
x Market Markup (per currency, e.g., 1.30 for USD = 30% margin)
    |
    v
x Zonos/DHL Markup (per currency, e.g., 1.22 for USD = 22% shipping/duties)
    |
    v
x Exchange Rate (NZD -> customer currency, e.g., 0.58 for USD)
    |
    v
= Final Customer Price (rounded UP to nearest whole number)
```

---

## Impact on the Shopify App

### SHORT ANSWER: Minimal impact. The price arriving at your endpoints is already fully calculated.

The configurator calculates the final customer-facing price (including all markups and currency conversion) **before** sending it to the Shopify app. This means:

1. **`/api/v1/public/product/create` endpoint** -- The `totalPrice` field in the request body is already the final price in the customer's currency. No changes needed.

2. **`/api/v1/public/email-summary-send` endpoint** -- The `totalPrice` field is already the final converted price. No changes needed.

3. **`/api/v1/public/file/upload` endpoint** -- No pricing data involved. No changes needed.

4. **`/api/v1/customers/subscribe` endpoint** -- No pricing data involved. No changes needed.

---

## Data Format Changes

### Product Creation Request Body

The data sent to `/api/v1/public/product/create` remains the same format. The `totalPrice` and `currency` fields work exactly as before:

```json
{
  "totalPrice": 1885,
  "currency": "USD",
  "fabricType": "monotec370",
  "fabricColor": "Charcoal",
  ...
}
```

The only difference is HOW `totalPrice` is calculated internally (now using database-driven rates instead of hardcoded ones). The value and format arriving at your endpoint is identical.

### Email Summary Request Body

Same as above -- `totalPrice` is already the final customer-facing price:

```json
{
  "totalPrice": "1885.00",
  "currency": "USD",
  ...
}
```

---

## Saved Quotes Change

A new `pricing_snapshot` field (JSONB) has been added to the `saved_quotes` table in Supabase. When a quote is saved, the current pricing settings are captured. This field looks like:

```json
{
  "USD": {
    "market_markup": 1.3,
    "zonos_dhl_markup": 1.0,
    "exchange_rate": 0.58,
    "currency_symbol": "US$"
  },
  "NZD": {
    "market_markup": 1.0,
    "zonos_dhl_markup": 1.0,
    "exchange_rate": 1.0,
    "currency_symbol": "NZ$"
  }
}
```

If the Shopify app reads from `saved_quotes` directly, this new field is available but optional. Existing quotes will have `NULL` for this field.

---

## Zonos Integration -- IMPORTANT DISCUSSION POINT

The new system includes a **Zonos/DHL Markup** multiplier per currency. This is designed to pre-calculate and include international shipping duties and tariffs in the product price.

### If Zonos is currently applied at Shopify checkout:

There is a risk of **double-charging** duties/tariffs:
1. Once via the Zonos/DHL Markup in the configurator price
2. Again via Zonos at Shopify checkout

### Recommended resolution:

**Option A (Recommended):** Disable Zonos duty calculation at checkout for ShadeSpace products. The configurator price already includes all duties via the Zonos/DHL markup. This gives customers a single "all-inclusive" price throughout their journey.

**Option B:** Keep Zonos/DHL markup at 1.0 (no markup) in the configurator and let Zonos handle duties at checkout. Customers will see a lower price in the configurator that increases at checkout.

**Current state:** All Zonos/DHL markups are set to 1.0 (no effect) pending this decision. The existing combined market markup values have been preserved so customer prices remain identical to what they were before this change.

---

## New API Endpoint (Configurator Internal)

A new Supabase Edge Function was created for the configurator's internal use:

**Endpoint:** `GET /functions/v1/pricing-settings`

This is called by the configurator frontend to fetch current pricing rates. The Shopify app does NOT need to call this endpoint. It is documented here for awareness only.

```
Response:
{
  "success": true,
  "settings": [
    {
      "currency_code": "NZD",
      "currency_name": "New Zealand Dollar",
      "currency_symbol": "NZ$",
      "market_markup": 1.0,
      "zonos_dhl_markup": 1.0,
      "exchange_rate": 1.0,
      "is_active": true,
      "display_order": 1,
      "updated_at": "2026-03-18T..."
    },
    ...
  ]
}
```

---

## Database Schema Changes

### New Table: `pricing_settings`

```sql
CREATE TABLE pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  currency_name text NOT NULL,
  currency_symbol text NOT NULL,
  market_markup numeric NOT NULL DEFAULT 1.0,
  zonos_dhl_markup numeric NOT NULL DEFAULT 1.0,
  exchange_rate numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### New Table: `pricing_history`

```sql
CREATE TABLE pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL,
  field_changed text NOT NULL,
  old_value text NOT NULL,
  new_value text NOT NULL,
  changed_by text NOT NULL DEFAULT 'admin',
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Modified Table: `saved_quotes`

```sql
-- New column added:
ALTER TABLE saved_quotes ADD COLUMN pricing_snapshot jsonb;
```

---

## Files Changed in the Configurator

For reference, these are the files modified in the configurator codebase:

| File | Change |
|------|--------|
| `src/hooks/usePricingSettings.ts` | **NEW** - Hook to fetch pricing settings from database with caching and fallback defaults |
| `src/hooks/useShadeCalculations.ts` | **MODIFIED** - Now accepts pricing settings map and applies 3-step markup flow |
| `src/data/pricing.ts` | **MODIFIED** - Hardcoded markups/rates marked as deprecated fallbacks |
| `src/components/ShadeConfigurator.tsx` | **MODIFIED** - Integrates usePricingSettings hook, passes settings to calculations |
| `src/components/UnifiedSaveModal.tsx` | **MODIFIED** - Passes pricing snapshot when saving quotes |
| `src/utils/quoteManager.ts` | **MODIFIED** - saveQuote() now accepts optional pricingSnapshot parameter |
| `src/components/admin/PricingManager.tsx` | **NEW** - Admin UI for managing pricing settings |
| `src/pages/AdminDashboard.tsx` | **MODIFIED** - Added "Pricing" tab |
| `supabase/functions/pricing-settings/index.ts` | **NEW** - Edge function for CRUD on pricing settings |
| `supabase/functions/save-quote/index.ts` | **MODIFIED** - Saves pricing_snapshot with quotes |

---

## Action Items for Shopify App Developer

1. **No code changes required** for product creation, email summary, or file upload endpoints
2. **Discuss with ShadeSpace team**: Zonos duty calculation at checkout -- should it be disabled for ShadeSpace products? (See Zonos section above)
3. **Optional**: If the Shopify app reads `saved_quotes` directly, be aware of the new `pricing_snapshot` JSONB column (nullable, NULL for existing quotes)
4. **Optional**: If the Shopify app displays pricing breakdowns anywhere, the configurator now passes the final all-inclusive price -- no additional conversion should be applied

---

## Testing

To verify nothing has changed from the Shopify app's perspective:

1. Configure a shade sail in any currency (e.g., USD)
2. Add to cart
3. Verify the product price matches what was shown in the configurator
4. Verify the cart line item properties display correctly
5. Complete a test checkout flow and verify no duplicate duty/tariff charges

The configurator prices should be identical to what they were before this change, since the existing combined markup values were preserved and Zonos/DHL markups default to 1.0.
