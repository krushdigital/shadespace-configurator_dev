# Functional Requirements: Database-Driven Currency Pricing System

**Document Version:** 1.2
**Date:** 14 April 2026
**Prepared For:** CFO & Shopify App Developer
**System:** ShadeSpace Shade Sail Configurator

---

## 1. Executive Summary

This document outlines the functional requirements for a new database-driven pricing system that replaces previously hardcoded currency markups and exchange rates. The system allows ShadeSpace administrators to adjust pricing parameters per currency through an admin dashboard without requiring code deployments.

The system uses a **three-factor pricing model** per currency, giving the business independent control over:

- **Market Markup** -- Margin adjustments per market/region
- **Zonos/DHL Markup** -- International shipping, duties, and tariff costs baked into the product price
- **Exchange Rate** -- NZD to foreign currency conversion rate

**All pricing is all-inclusive.** The price the customer sees in the configurator is the price they pay at checkout. All Zonos/DHL shipping costs, duties, and tariffs are pre-calculated and baked into the displayed price. There are no surprise charges at checkout.

---

## 2. Business Problem

Previously, all pricing adjustments (market margins, shipping costs, tariffs, currency conversion) were consolidated into a single hardcoded "markup" value per currency. This created several issues:

1. Changing any pricing parameter required a code deployment
2. Zonos/DHL shipping and duty costs could not be adjusted independently from market margins
3. No audit trail of when or why pricing was changed
4. No visibility into how the final customer price was composed

---

## 3. All-Inclusive Pricing Strategy

ShadeSpace operates on an **all-inclusive pricing model**. The price displayed to the customer at every stage -- from the configurator through to Shopify checkout -- includes:

- Product cost (fabric, corners, hardware)
- Market-specific margin adjustments
- International shipping costs (Zonos/DHL)
- Import duties and tariffs
- Currency conversion

**This means:**
- Customers see one consistent price from configurator to checkout
- No additional duties, tariffs, or shipping surcharges are added at Shopify checkout
- Zonos duty/tariff calculation must be **disabled** at Shopify checkout for ShadeSpace products to avoid double-charging
- The customer-facing messaging is: **"All taxes, duties & shipping included"**

---

## 4. Pricing Calculation Flow

All base product costs (fabric, corners, hardware) are maintained in **New Zealand Dollars (NZD)**.

The customer-facing price is calculated using an **additive model** where market markup and Zonos/DHL markup are applied **independently to the base rate**, then summed before currency conversion:

```
Step 1: Base NZD Price
        = Fabric Cost + Corner Cost + Hardware Cost
        (All sourced from NZD product cost tables)

Step 2: Market Markup (applied to base)
        = Step 1 x market_markup
        Purpose: Adjusts margins per market/region

Step 3: Zonos/DHL Cost (applied independently to base)
        = Step 1 x (zonos_dhl_markup - 1)
        Purpose: Pre-bakes international shipping, duties, and tariffs
        into the product price (all-inclusive pricing)

Step 4: Combined NZD Total
        = Step 2 + Step 3
        = Base NZD x (market_markup + zonos_dhl_markup - 1)

Step 5: Currency Conversion
        = Step 4 x exchange_rate
        Purpose: Converts from NZD to customer's currency

Final Price = Round UP to nearest whole number
```

**Important:** Both uplifts are calculated as independent percentages of the base NZD price -- they do not compound on each other. Currency conversion happens LAST. All internal calculations remain in NZD until the final display step.

**Combined Factor Formula:** `(market_markup + zonos_dhl_markup - 1) x exchange_rate`

---

## 5. Current Pricing Settings

| Currency | Market Markup | Zonos/DHL Markup | Exchange Rate | Combined Factor |
|----------|--------------|------------------|---------------|-----------------|
| NZD      | 1.0000 (0%)    | 1.05 (5%)   | 1.0000        | 1.0500          |
| USD      | 1.0833 (8.3%)  | 1.20 (20%)  | 0.5800        | 0.7443          |
| AUD      | 0.7500 (-25%)  | 1.20 (20%)  | 0.8800        | 0.8360          |
| GBP      | 1.4000 (40%)   | 1.20 (20%)  | 0.4300        | 0.6880          |
| EUR      | 1.3767 (37.7%) | 1.20 (20%)  | 0.5000        | 0.7884          |
| CAD      | 1.0833 (8.3%)  | 1.20 (20%)  | 0.8100        | 1.0395          |
| AED      | 1.7500 (75%)   | 1.20 (20%)  | 2.1900        | 4.2705          |

**Combined Factor** = `(market_markup + zonos_dhl_markup - 1) x exchange_rate`. Both uplifts are applied independently to the base NZD rate and summed -- they do not compound.

**NZD:** Domestic orders have no market markup and a 1:1 exchange rate. A 5% Zonos/DHL markup covers domestic DHL delivery costs. NZD customers pay 5% above the base product cost.

---

## 6. Example Pricing Calculations

For a shade sail with a base NZD price of **NZ$2,500**:

### USD Customer:
```
Base NZD:           NZ$2,500.00
Market Markup:      NZ$2,500.00 x 1.0833       = NZ$2,708.25  (on base)
Zonos/DHL Cost:     NZ$2,500.00 x (1.20 - 1)   = NZ$  500.00  (on base)
Combined NZD:       NZ$2,708.25 + NZ$500.00     = NZ$3,208.25
Exchange Rate:      NZ$3,208.25 x 0.58          = US$1,860.79
Final Price:        US$1,861 (all-inclusive, rounded up)
```

### AUD Customer:
```
Base NZD:           NZ$2,500.00
Market Markup:      NZ$2,500.00 x 0.75         = NZ$1,875.00  (on base)
Zonos/DHL Cost:     NZ$2,500.00 x (1.20 - 1)   = NZ$  500.00  (on base)
Combined NZD:       NZ$1,875.00 + NZ$500.00     = NZ$2,375.00
Exchange Rate:      NZ$2,375.00 x 0.88          = AU$2,090.00
Final Price:        AU$2,090 (all-inclusive, rounded up)
```

### GBP Customer:
```
Base NZD:           NZ$2,500.00
Market Markup:      NZ$2,500.00 x 1.40         = NZ$3,500.00  (on base)
Zonos/DHL Cost:     NZ$2,500.00 x (1.20 - 1)   = NZ$  500.00  (on base)
Combined NZD:       NZ$3,500.00 + NZ$500.00     = NZ$4,000.00
Exchange Rate:      NZ$4,000.00 x 0.43          = £1,720.00
Final Price:        £1,720 (all-inclusive, rounded up)
```

---

## 7. Admin Dashboard - Pricing Management

A new "Pricing" tab has been added to the ShadeSpace admin dashboard at `/admin`. This provides:

### 7.1 View Pricing Settings
- Table showing all currencies with their current market markup, Zonos/DHL markup, exchange rate, and combined factor
- Example calculation panel showing what a NZ$1,000 base price converts to in each currency
- Last updated timestamp per currency

### 7.2 Edit Pricing Settings
- Inline editing of market markup, Zonos/DHL markup, and exchange rate per currency
- Input validation (all values must be positive numbers)
- Save/Cancel actions per row
- Changes take effect immediately for new configurator sessions

### 7.3 Change History / Audit Trail
- Logs every pricing change with: date, currency, field changed, old value, new value, and who made the change
- Provides full accountability for pricing decisions

---

## 8. Data Architecture

### 8.1 Database Table: `pricing_settings`

| Column           | Type     | Description                                          |
|------------------|----------|------------------------------------------------------|
| id               | UUID     | Primary key                                          |
| currency_code    | TEXT     | ISO 4217 code (e.g., USD, AUD, GBP) - unique        |
| currency_name    | TEXT     | Display name (e.g., "US Dollar")                     |
| currency_symbol  | TEXT     | Display symbol (e.g., "US$", "AU$")                  |
| market_markup    | NUMERIC  | Market margin multiplier (e.g., 1.30 = 30% markup)  |
| zonos_dhl_markup | NUMERIC  | Shipping/duties multiplier baked into all-inclusive price (e.g., 1.22 = 22%) |
| exchange_rate    | NUMERIC  | NZD to this currency (e.g., 0.58 for USD)           |
| is_active        | BOOLEAN  | Whether currency is available in configurator        |
| display_order    | INTEGER  | Sort order in currency selector                      |
| updated_at       | TIMESTAMP| Last modification time                               |
| created_at       | TIMESTAMP| Creation time                                        |

### 8.2 Database Table: `pricing_history`

| Column        | Type     | Description                              |
|---------------|----------|------------------------------------------|
| id            | UUID     | Primary key                              |
| currency_code | TEXT     | Which currency was changed               |
| field_changed | TEXT     | Which field was updated                  |
| old_value     | TEXT     | Previous value                           |
| new_value     | TEXT     | New value                                |
| changed_by    | TEXT     | Who made the change                      |
| change_reason | TEXT     | Optional reason (nullable)               |
| created_at    | TIMESTAMP| When the change was made                 |

### 8.3 Quote Pricing Snapshot

When a quote is saved, the pricing settings active at that moment are captured in the `pricing_snapshot` column (JSONB) of `saved_quotes`. This ensures:

- Historical quotes display with the prices the customer originally saw
- Price changes do not retroactively alter existing quotes
- Audit capability to see exactly what rates were applied to any quote

---

## 9. Shopify App Integration -- Mandatory Requirements

### 9.1 All-Inclusive Price is the Final Price

The price sent from the configurator to the Shopify product creation endpoint already includes ALL costs: product, market markup, Zonos/DHL duties/tariffs, and currency conversion. The Shopify app receives the final customer-facing price. No additional processing is required.

### 9.2 Zonos Must Be Disabled at Checkout

Because all duties and tariffs are pre-baked into the product price, Zonos duty/tariff calculation **must be disabled** at Shopify checkout for ShadeSpace products. If Zonos is left active, customers will be double-charged for duties and tariffs.

**Required action:** The Shopify app developer must ensure Zonos does not apply additional duty/tariff charges at checkout for products created by the ShadeSpace configurator.

### 9.3 No API Changes Required

The Shopify app does not need to call the pricing settings API. The configurator frontend handles all pricing calculations and sends the final price when creating products. The Shopify app receives the same data format as before.

---

## 10. Security Requirements

- Pricing settings can only be modified by authenticated admin users
- All changes are logged in the pricing_history audit table
- The configurator (public-facing) can only READ active pricing settings
- Row Level Security (RLS) is enforced at the database level
- Admin password is required for all write operations

---

## 11. Business Rules

1. All markups and exchange rates must be positive numbers (> 0)
2. NZD always has market_markup = 1.0, zonos_dhl_markup = 1.05 (5% domestic DHL delivery), exchange_rate = 1.0
3. Final prices are always rounded UP to the nearest whole number
4. All prices are all-inclusive -- what the customer sees is what they pay
5. Zonos/DHL costs are baked into the price via the zonos_dhl_markup multiplier, NOT calculated at checkout
6. Changes to pricing settings take effect immediately for new configurator sessions
7. Existing saved quotes retain their original pricing via the pricing snapshot
8. Exchange rates are manually updated by the ShadeSpace team (no automatic feeds)

---
