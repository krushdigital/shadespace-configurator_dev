# ShadeSpace Professional Shade Sail Configurator

A professional shade sail configurator application built with React and Vite, designed to allow customers to customize their shade sails, visualize them, and receive an instant all-inclusive quote. Integrates with Supabase for data persistence and Shopify for e-commerce.

## Project Overview

The ShadeSpace Configurator guides users through a multi-step process to design their custom shade sail:

1. **Fabric & Color Selection**: Choose from various fabric types and colors.
2. **Edge Reinforcement Style**: Select between 'Webbing Reinforced' or 'Cabled Edge'.
3. **Number of Fixing Points**: Define the number of corners (3, 4, 5, or 6).
4. **Measurement Options**: Specify units (metric/imperial) and manufacturing option ('Adjust to fit space' or 'Exact dimensions').
5. **Dimensions**: Input precise edge and diagonal measurements, with interactive visual feedback.
6. **Heights & Anchor Points**: Configure the height, type (post/building), and eye orientation for each anchor point.
7. **Review & Purchase**: Review the configuration, acknowledge terms, and proceed to purchase.

The application provides real-time all-inclusive pricing calculations, interactive diagrams, and the ability to generate a PDF quote.

## Technology Stack

- **Frontend**: React (with TypeScript), Vite
- **Styling**: Tailwind CSS
- **Analytics**: Google Analytics 4 (GA4) with comprehensive event tracking
- **Backend**: Supabase (Database, Edge Functions)
- **E-commerce Integration**: Shopify Admin API for customer management and product creation
- **PDF Generation**: `jspdf` and `html2canvas` (client-side), with a Supabase Edge Function for server-side PDF generation
- **Icons**: `lucide-react`

## Pricing System

ShadeSpace uses **all-inclusive pricing**. The price the customer sees is the final price they pay at checkout. All costs are baked in:

- Product cost (fabric, corners, hardware)
- Market-specific margins
- International shipping (Zonos/DHL)
- Import duties and tariffs
- Currency conversion

Pricing settings are stored in Supabase (`pricing_settings` table) and managed via the Admin Dashboard "Pricing" tab. Three separate multipliers per currency:

1. **Market Markup** -- Business margin per market
2. **Zonos/DHL Markup** -- Shipping, duties, tariffs baked into the all-inclusive price
3. **Exchange Rate** -- NZD to foreign currency conversion

All changes are logged in a `pricing_history` audit table.

For full pricing documentation, see [PRICING_FUNCTIONAL_REQUIREMENTS.md](./PRICING_FUNCTIONAL_REQUIREMENTS.md) and [SHOPIFY_APP_PRICING_CHANGES.md](./SHOPIFY_APP_PRICING_CHANGES.md).

## Important Documentation

- **[PRICING_FUNCTIONAL_REQUIREMENTS.md](./PRICING_FUNCTIONAL_REQUIREMENTS.md)** -- Business requirements for the three-factor pricing model
- **[SHOPIFY_APP_PRICING_CHANGES.md](./SHOPIFY_APP_PRICING_CHANGES.md)** -- Shopify developer guide for database-driven pricing and Zonos integration
- **[GA4_SHOPIFY_INTEGRATION.md](./GA4_SHOPIFY_INTEGRATION.md)** -- GA4 event tracking and Shopify customer integration guide
- **[ADMIN_DASHBOARD_GUIDE.md](./ADMIN_DASHBOARD_GUIDE.md)** -- Admin dashboard usage and configuration
- **[ADMIN_QUICK_START.md](./ADMIN_QUICK_START.md)** -- Quick start for admin dashboard access
- **[DEVELOPER_SETUP_GUIDE.md](./DEVELOPER_SETUP_GUIDE.md)** -- Complete developer setup and troubleshooting
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** -- Environment variable quick reference

## Project Structure

```
src/
  App.tsx                          Main application component
  main.tsx                         Entry point
  index.css                        Tailwind CSS imports and custom styles
  ShadeConfigurator.tsx            Main configurator with state management
  components/
    ShadeConfigurator.tsx          Configurator UI wrapper
    ShapeCanvas.tsx                Interactive SVG diagram
    InteractiveMeasurementCanvas.tsx  Measurement interaction canvas
    ShadeSVGCore.tsx               Core SVG rendering
    ShadeSail3DModel.tsx           3D model visualization
    MobilePricingBar.tsx           Mobile pricing display
    PriceSummaryDisplay.tsx        Price summary component
    SaveQuoteModal.tsx             Quote saving modal
    UnifiedSaveModal.tsx           Unified save/email modal
    MyQuotesModal.tsx              Quote history modal
    steps/                         Step content components
      FabricSelectionContent.tsx
      EdgeTypeContent.tsx
      CornersContent.tsx
      CombinedMeasurementContent.tsx
      DimensionsContent.tsx
      FixingPointsContent.tsx
      ReviewContent.tsx
    admin/                         Admin dashboard components
      AnalyticsSummary.tsx
      EventsChart.tsx
      EventsTable.tsx
      PricingManager.tsx           Pricing settings management
      SavedQuotesTable.tsx
    ui/                            Reusable UI components
  data/
    fabrics.ts                     Fabric types and colors
    pricing.ts                     Base pricing tiers (NZD) and deprecated fallback rates
  hooks/
    usePricingSettings.ts          Fetches pricing settings from database with caching
    useShadeCalculations.ts        Core pricing logic with three-factor markup
    useMobileGuidance.ts           Mobile guidance state
  pages/
    Admin.tsx                      Admin route handler
    AdminDashboard.tsx             Admin dashboard with Overview, Quotes, Events, Pricing tabs
    AdminLogin.tsx                 Admin authentication
  types/
    index.ts                       TypeScript type definitions
  utils/
    analytics.ts                   GA4 event tracking (70+ events)
    currencyFormatter.ts           Currency display formatting
    eventTracker.ts                Event tracking utilities
    geometry.ts                    Unit conversions, measurement validation
    imperialParser.ts              Imperial measurement parsing
    pdfGenerator.ts                Client-side PDF generation
    quoteManager.ts                Quote save/load with pricing snapshot
    quoteNaming.ts                 Quote naming utilities
    svgHelpers.ts                  SVG rendering helpers
    tokenManager.ts                Access token management
    unitAutoSelection.ts           Automatic unit selection

supabase/
  functions/
    save-quote/                    Saves quote data to database
    add-shopify-customer/          Creates/updates customers in Shopify
    send-email-summary/            Sends email summaries with PDF
    generate-pdf/                  Server-side PDF generation
    pricing-settings/              CRUD for pricing settings (admin)
    search-quotes/                 Quote search functionality
    track-event/                   Analytics event capture
  migrations/                      Database migration files
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `saved_quotes` | Customer quote configurations with pricing snapshots |
| `pricing_settings` | Per-currency markup, Zonos/DHL, and exchange rate settings |
| `pricing_history` | Audit trail of all pricing changes |
| `user_events` | Analytics event tracking |
| `analytics_cache` | Pre-computed analytics for admin dashboard |
| `admin_users` | Admin user management |
| `user_guidance_preferences` | Mobile guidance state |

## Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `save-quote` | Saves customer quotes and triggers Shopify customer creation |
| `add-shopify-customer` | Creates/updates customers in Shopify with quote metadata |
| `send-email-summary` | Sends quote summary emails with PDF attachments |
| `generate-pdf` | Server-side PDF generation |
| `pricing-settings` | Read/update pricing settings (admin) |
| `search-quotes` | Search quotes by reference, email, or name |
| `track-event` | Captures analytics events |

## Key Functionality

- **State Management**: Centralized in `src/ShadeConfigurator.tsx` using React useState
- **Pricing Engine**: `src/hooks/useShadeCalculations.ts` with three-factor markup (market, Zonos/DHL, exchange rate) using database-driven settings from `src/hooks/usePricingSettings.ts`
- **Validation**: `src/utils/geometry.ts` with typo detection and measurement validation
- **PDF Generation**: Dual approach with client-side fallback and server-side reliability
- **Admin Dashboard**: Analytics, quote management, event tracking, and pricing management at `/admin`
- **Shopify Integration**: Automatic customer creation when users save quotes with email; customer tags and metafields for segmentation

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Security Notes

- Never commit the `.env` file to version control
- Store sensitive credentials securely
- Rotate API keys and tokens regularly
- Admin dashboard uses password-based authentication (configure `VITE_ADMIN_PASSWORD`)
