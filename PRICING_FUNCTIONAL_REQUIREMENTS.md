# Functional Requirements: Database-Driven Currency Pricing System

**Document Version:** 1.0
**Date:** 18 March 2026
**Prepared For:** CFO & Shopify App Developer
**System:** ShadeSpace Shade Sail Configurator

---

## 1. Executive Summary

This document outlines the functional requirements for a new database-driven pricing system that replaces previously hardcoded currency markups and exchange rates. The system allows ShadeSpace administrators to adjust pricing parameters per currency through an admin dashboard without requiring code deployments.

The key change is the introduction of a **per-currency Zonos/DHL markup** that is separate from the existing market markup. This gives the business independent control over:

- **Market Markup** -- Margin adjustments per market/region
- **Zonos/DHL Markup** -- International shipping, duties, and tariff costs per currency/region
- **Exchange Rate** -- NZD to foreign currency conversion rate

---

## 2. Business Problem

Previously, all pricing adjustments (market margins, shipping costs, tariffs, currency conversion) were consolidated into a single hardcoded "markup" value per currency. This created several issues:

1. Changing any pricing parameter required a code deployment
2. Zonos/DHL shipping and duty costs could not be adjusted independently from market margins
3. No audit trail of when or why pricing was changed
4. No visibility into how the final customer price was composed

---

## 3. Pricing Calculation Flow

All base product costs (fabric, corners, hardware) are maintained in **New Zealand Dollars (NZD)**.

The customer-facing price is calculated in four sequential steps:

```
Step 1: Base NZD Price
        = Fabric Cost + Corner Cost + Hardware Cost
        (All sourced from NZD product cost tables)

Step 2: Market Markup (per currency)
        = Step 1 x market_markup
        Purpose: Adjusts margins per market/region

Step 3: Zonos/DHL Markup (per currency)
        = Step 2 x zonos_dhl_markup
        Purpose: Covers international shipping, duties, and tariffs

Step 4: Currency Conversion
        = Step 3 x exchange_rate
        Purpose: Converts from NZD to customer's currency

Final Price = Round UP to nearest whole number
```

**Important:** Currency conversion happens LAST. All internal calculations remain in NZD until the final display step.

---

## 4. Current Pricing Settings

| Currency | Market Markup | Zonos/DHL Markup | Exchange Rate | Combined Factor |
|----------|--------------|------------------|---------------|-----------------|
| NZD      | 1.000 (0%)   | 1.000 (0%)       | 1.0000        | 1.0000          |
| USD      | 1.300 (30%)  | 1.000 (0%)       | 0.5800        | 0.7540          |
| AUD      | 0.900 (-10%) | 1.000 (0%)       | 0.8800        | 0.7920          |
| GBP      | 1.680 (68%)  | 1.000 (0%)       | 0.4300        | 0.7224          |
| EUR      | 1.652 (65.2%)| 1.000 (0%)       | 0.5000        | 0.8260          |
| CAD      | 1.300 (30%)  | 1.000 (0%)       | 0.8100        | 1.0530          |
| AED      | 2.100 (110%) | 1.000 (0%)       | 2.1900        | 4.5990          |

**Note:** Zonos/DHL markups are currently set to 1.0 (no markup) for all currencies. These are ready to be configured by the business team once Zonos/DHL cost data is available per region.

---

## 5. Example Pricing Calculation

For a shade sail with a base NZD price of **NZ$2,500**:

### USD Customer (current settings):
```
Base NZD:       NZ$2,500.00
Market Markup:  NZ$2,500.00 x 1.30  = NZ$3,250.00
Zonos/DHL:      NZ$3,250.00 x 1.00  = NZ$3,250.00
Exchange Rate:  NZ$3,250.00 x 0.58  = US$1,885.00
Final Price:    US$1,885 (rounded up)
```

### USD Customer (with hypothetical 22% Zonos/DHL markup):
```
Base NZD:       NZ$2,500.00
Market Markup:  NZ$2,500.00 x 1.30  = NZ$3,250.00
Zonos/DHL:      NZ$3,250.00 x 1.22  = NZ$3,965.00
Exchange Rate:  NZ$3,965.00 x 0.58  = US$2,300.00
Final Price:    US$2,300 (rounded up)
```

### AUD Customer (with hypothetical 10% Zonos/DHL markup):
```
Base NZD:       NZ$2,500.00
Market Markup:  NZ$2,500.00 x 0.90  = NZ$2,250.00
Zonos/DHL:      NZ$2,250.00 x 1.10  = NZ$2,475.00
Exchange Rate:  NZ$2,475.00 x 0.88  = AU$2,178.00
Final Price:    AU$2,178 (rounded up)
```

---

## 6. Admin Dashboard - Pricing Management

A new "Pricing" tab has been added to the ShadeSpace admin dashboard at `/admin`. This provides:

### 6.1 View Pricing Settings
- Table showing all currencies with their current market markup, Zonos/DHL markup, exchange rate, and combined factor
- Example calculation panel showing what a NZ$1,000 base price converts to in each currency
- Last updated timestamp per currency

### 6.2 Edit Pricing Settings
- Inline editing of market markup, Zonos/DHL markup, and exchange rate per currency
- Input validation (all values must be positive numbers)
- Save/Cancel actions per row
- Changes take effect immediately for new configurator sessions

### 6.3 Change History / Audit Trail
- Logs every pricing change with: date, currency, field changed, old value, new value, and who made the change
- Provides full accountability for pricing decisions

---

## 7. Data Architecture

### 7.1 Database Table: `pricing_settings`

| Column           | Type     | Description                                          |
|------------------|----------|------------------------------------------------------|
| id               | UUID     | Primary key                                          |
| currency_code    | TEXT     | ISO 4217 code (e.g., USD, AUD, GBP) - unique        |
| currency_name    | TEXT     | Display name (e.g., "US Dollar")                     |
| currency_symbol  | TEXT     | Display symbol (e.g., "US$", "AU$")                  |
| market_markup    | NUMERIC  | Market margin multiplier (e.g., 1.30 = 30% markup)  |
| zonos_dhl_markup | NUMERIC  | Shipping/duties multiplier (e.g., 1.22 = 22%)       |
| exchange_rate    | NUMERIC  | NZD to this currency (e.g., 0.58 for USD)           |
| is_active        | BOOLEAN  | Whether currency is available in configurator        |
| display_order    | INTEGER  | Sort order in currency selector                      |
| updated_at       | TIMESTAMP| Last modification time                               |
| created_at       | TIMESTAMP| Creation time                                        |

### 7.2 Database Table: `pricing_history`

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

### 7.3 Quote Pricing Snapshot

When a quote is saved, the pricing settings active at that moment are captured in the `pricing_snapshot` column (JSONB) of `saved_quotes`. This ensures:

- Historical quotes display with the prices the customer originally saw
- Price changes do not retroactively alter existing quotes
- Audit capability to see exactly what rates were applied to any quote

---

## 8. Shopify App Integration Impact

### 8.1 What Changes for the Shopify App

The Shopify app's pricing display needs to be aware that the ShadeSpace configurator now uses database-driven pricing. Key considerations:

1. **Product Creation Price**: The price sent from the configurator to the Shopify product creation endpoint already includes all markups and currency conversion. No change is needed to the product creation flow -- the price arriving is the final customer-facing price.

2. **Currency Display**: The configurator handles all currency conversion internally before passing the price to Shopify. The Shopify app receives the final price in the customer's selected currency.

3. **Price Consistency**: If Zonos is also applied at the Shopify checkout level, there could be double-application of duties/tariffs. The Zonos/DHL markup in this system is designed to be a **pre-calculated estimate** baked into the product price. Coordination is required to determine whether Zonos should be disabled at checkout for ShadeSpace products, or whether the Zonos/DHL markup in this system should be set to 1.0 (no markup) and Zonos handles it at checkout.

### 8.2 Recommended Approach for Zonos/DHL

**Option A - Pre-baked (Recommended):**
- Zonos/DHL markup is applied in the configurator (this system)
- Zonos is DISABLED at Shopify checkout for ShadeSpace products
- Customer sees one price throughout the entire journey
- Marketing message: "All taxes & duties included"

**Option B - Checkout-calculated:**
- Zonos/DHL markup is set to 1.0 in this system (no markup)
- Zonos calculates duties/tariffs at Shopify checkout
- Customer sees a lower price in configurator, then duties added at checkout
- May cause cart abandonment due to price increase

### 8.3 No API Changes Required

The Shopify app does not need to call the pricing settings API. The configurator frontend handles all pricing calculations and sends the final price when creating products. The Shopify app receives the same data format as before.

---

## 9. Security Requirements

- Pricing settings can only be modified by authenticated admin users
- All changes are logged in the pricing_history audit table
- The configurator (public-facing) can only READ active pricing settings
- Row Level Security (RLS) is enforced at the database level
- Admin password is required for all write operations

---

## 10. Business Rules

1. All markups and exchange rates must be positive numbers (> 0)
2. NZD always has market_markup = 1.0, zonos_dhl_markup = 1.0, exchange_rate = 1.0 (domestic)
3. Final prices are always rounded UP to the nearest whole number
4. Changes to pricing settings take effect immediately for new configurator sessions
5. Existing saved quotes retain their original pricing via the pricing snapshot
6. Exchange rates are manually updated by the ShadeSpace team (no automatic feeds)

---

## 11. Future Considerations

1. **Automatic Exchange Rate Updates**: Integration with a currency API (e.g., Open Exchange Rates) for daily automatic exchange rate updates while keeping market and Zonos/DHL markups as manual admin-controlled values
2. **Pricing Tiers**: Different markups based on order value ranges
3. **Promotional Pricing**: Time-limited discount multipliers per currency
4. **New Currencies**: Adding new currencies through the admin dashboard (POST endpoint already supports this)
