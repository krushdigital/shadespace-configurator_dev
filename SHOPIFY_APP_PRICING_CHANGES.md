# Shopify App Developer Guide: Database-Driven Pricing Changes

**Date:** 18 March 2026
**For:** Shopify App Developer
**System:** ShadeSpace Configurator Pricing System

---

## Overview of Changes

The ShadeSpace configurator has been updated to use **database-driven pricing** instead of hardcoded currency markups and exchange rates. This document explains what changed, what impacts the Shopify app, and what needs to be updated on the Shopify side.

---

## All-Inclusive Pricing -- Key Concept

ShadeSpace uses **all-inclusive pricing**. The price the customer sees in the configurator is the final price they pay at checkout. All costs are baked in:

- Product cost
- Market margins
- International shipping (Zonos/DHL)
- Import duties and tariffs
- Currency conversion

**There must be no additional charges at Shopify checkout.** See the mandatory action item in the "Zonos" section below.

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
  2. **Zonos/DHL Markup** -- Shipping, duties, tariffs baked into the all-inclusive price
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
    |                 (baked into price -- all-inclusive)
    v
x Exchange Rate (NZD -> customer currency, e.g., 0.58 for USD)
    |
    v
= Final All-Inclusive Customer Price (rounded UP to nearest whole number)
```

---

## Impact on the Shopify App

### SHORT ANSWER: Minimal code impact. One mandatory configuration change for Zonos.

The configurator calculates the final customer-facing price (including all markups, duties, and currency conversion) **before** sending it to the Shopify app. This means:

1. **`/api/v1/public/product/create` endpoint** -- The `totalPrice` field in the request body is already the final all-inclusive price in the customer's currency. No changes needed.

2. **`/api/v1/public/email-summary-send` endpoint** -- The `totalPrice` field is already the final all-inclusive price. No changes needed.

3. **`/api/v1/public/file/upload` endpoint** -- No pricing data involved. No changes needed.

4. **`/api/v1/customers/subscribe` endpoint** -- No pricing data involved. No changes needed.

---

## MANDATORY: Disable Zonos at Checkout

**This is the single most important action item for the Shopify app developer.**

Because all Zonos/DHL duties, tariffs, and shipping costs are now pre-baked into the configurator's product price, Zonos **must be disabled** at Shopify checkout for products created by the ShadeSpace configurator.

If Zonos remains active at checkout, customers will be **double-charged** for duties and tariffs:
1. Once via the Zonos/DHL markup already included in the product price
2. Again via Zonos calculating duties at checkout

**Required action:** Ensure that Zonos does not apply additional duty/tariff/shipping charges at Shopify checkout for ShadeSpace configurator products. The all-inclusive price from the configurator IS the final price.

**Customer-facing messaging:** "All taxes, duties & shipping included"

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

Same as above -- `totalPrice` is already the final all-inclusive customer-facing price:

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

## Action Items Summary

| # | Action | Priority | Status |
|---|--------|----------|--------|
| 1 | **Disable Zonos duty/tariff calculation at Shopify checkout** for ShadeSpace configurator products | MANDATORY | Pending |
| 2 | No code changes needed for product creation endpoint | Info | N/A |
| 3 | No code changes needed for email summary endpoint | Info | N/A |
| 4 | If reading `saved_quotes` directly, be aware of new `pricing_snapshot` column (nullable) | Optional | N/A |
| 5 | If displaying pricing breakdowns, the configurator price is all-inclusive -- no additional conversion | Optional | N/A |

---

## Testing

To verify nothing has changed from the Shopify app's perspective:

1. Configure a shade sail in any currency (e.g., USD)
2. Add to cart
3. Verify the product price matches what was shown in the configurator
4. Verify the cart line item properties display correctly
5. Complete a test checkout flow and **confirm no Zonos duties/tariffs are added on top** of the all-inclusive price

The configurator prices should be identical to what they were before this change, since the existing combined markup values were preserved and Zonos/DHL markups default to 1.0.
