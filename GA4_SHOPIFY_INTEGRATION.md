# GA4 Tracking & Shopify Customer Integration - Developer Implementation Guide

**Version:** 1.0
**Last Updated:** October 2025
**Status:** Production Ready

---

## Table of Contents

1. [Overview and Architecture](#1-overview-and-architecture)
2. [GA4 Tracking Implementation](#2-ga4-tracking-implementation)
3. [Shopify Customer Integration](#3-shopify-customer-integration)
4. [Environment Configuration (Non-Technical Guide)](#4-environment-configuration-non-technical-guide)
5. [Developer Configuration and Setup](#5-developer-configuration-and-setup)
6. [Code Integration Points](#6-code-integration-points)
7. [Testing and Verification](#7-testing-and-verification)
8. [Migration and Updates](#8-migration-and-updates)
9. [API Reference](#9-api-reference)
10. [Monitoring and Analytics](#10-monitoring-and-analytics)
11. [Troubleshooting Guide](#11-troubleshooting-guide)

---

## 1. Overview and Architecture

### 1.1 Purpose

This guide provides comprehensive documentation for the integrated GA4 (Google Analytics 4) tracking and Shopify customer management system implemented in the ShadeSpace Shade Sail Configurator. The integration enables:

- **Real-time user behavior tracking** across all configurator steps
- **Automatic customer creation** in Shopify when quotes are saved
- **Seamless data flow** between the configurator, Supabase, and Shopify
- **Enhanced customer insights** for marketing and sales optimization
- **Quote-to-customer conversion tracking** for funnel analysis

### 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ShadeConfigurator Component                             │  │
│  │  - User interactions trigger analytics events            │  │
│  │  - State management for configuration data               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Analytics Utility (src/utils/analytics.ts)             │  │
│  │  - 70+ tracked events                                    │  │
│  │  - Window.gtag() integration                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Google Analytics 4 (gtag.js)                            │  │
│  │  - Measurement ID: G-V8131RB72K                          │  │
│  │  - Real-time event collection                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              Google Analytics 4 Dashboard                       │
│  - Event reporting and analysis                                 │
│  - Custom funnels and conversion tracking                       │
│  - User journey visualization                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                Quote Save Flow with Shopify                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SaveQuoteModal Component                                │  │
│  │  - User enters email and saves quote                     │  │
│  │  - Tracks user interaction events                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Edge Function: save-quote                      │  │
│  │  - Saves quote data to saved_quotes table                │  │
│  │  - Generates unique quote reference                      │  │
│  │  - Calls add-shopify-customer if email provided          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Edge Function: add-shopify-customer            │  │
│  │  - Searches for existing customer by email               │  │
│  │  - Creates new customer or updates existing              │  │
│  │  - Adds quote metadata and tags                          │  │
│  │  - Returns customer ID to frontend                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shopify Admin API                                       │  │
│  │  - Customers endpoint (create/update)                    │  │
│  │  - Customer search endpoint                              │  │
│  │  - Metafields and tags storage                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shopify Store Customer Database                         │  │
│  │  - Customer profiles with quote history                  │  │
│  │  - Tags: "configurator-quote", "high-value-quote"        │  │
│  │  - Metafields: quote_reference, quote_value, etc.        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Data Flow Summary

1. **User Interaction** → User navigates through configurator steps
2. **Event Tracking** → Analytics events sent to GA4 in real-time
3. **Quote Configuration** → User completes shade sail configuration
4. **Quote Save** → User clicks "Save Quote" and optionally provides email
5. **Supabase Storage** → Quote data saved to Supabase database
6. **Customer Creation** → If email provided, customer created/updated in Shopify
7. **Tracking Completion** → Success events sent to GA4 with customer ID
8. **Data Analysis** → Marketing team analyzes conversion funnel in GA4

### 1.4 Key Benefits

- **Complete User Journey Visibility**: Track every interaction from entry to purchase
- **Customer Segmentation**: Automatically tag customers based on quote characteristics
- **Conversion Optimization**: Identify drop-off points and optimize user experience
- **Marketing Attribution**: Understand which channels drive high-value quotes
- **Sales Follow-up**: Sales team can follow up with customers who saved quotes
- **Product Insights**: Analyze which fabric types and configurations are most popular

---

## 2. GA4 Tracking Implementation

### 2.1 GA4 Initialization

The GA4 tracking code is initialized in `index.html`:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-V8131RB72K"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-V8131RB72K');
</script>
```

**Key Points:**
- Measurement ID: `G-V8131RB72K` (replace with your own)
- Asynchronous loading to prevent blocking page render
- Global `gtag()` function available throughout the application
- Data layer initialized before first event

### 2.2 Analytics Utility Structure

Location: `src/utils/analytics.ts`

**Core Functions:**

```typescript
// Base event tracking function
export const trackEvent = (eventName: string, properties?: GAEventProperties): void => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', eventName, properties);
    console.log('📊 GA Event:', eventName, properties);
  } else {
    console.warn('⚠️ Google Analytics not initialized. Event:', eventName, properties);
  }
};

// Page view tracking
export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (window.gtag) {
    window.gtag('config', 'G-V8131RB72K', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

// Performance timing tracking
export const trackTiming = (name: string, value: number, category?: string, label?: string): void => {
  trackEvent('timing_complete', {
    name,
    value,
    event_category: category,
    event_label: label,
  });
};

// Error tracking
export const trackError = (errorMessage: string, errorType: string, fatal: boolean = false): void => {
  trackEvent('error_occurred', {
    error_message: errorMessage,
    error_type: errorType,
    fatal: fatal ? 'true' : 'false',
  });
};
```

### 2.3 Event Categories and Tracking

#### 2.3.1 Session and Configurator Events

**Purpose:** Track overall configurator usage and session metrics

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `configurator_loaded` | Page load | `timestamp` | Track entry point |
| `configurator_session_start` | First interaction | `session_id`, `entry_point` | Session analysis |
| `form_abandoned` | User exits | `last_completed_step`, `total_time_seconds` | Drop-off analysis |
| `configurator_timeout` | Inactivity | `last_active_step`, `session_duration_seconds` | Engagement metrics |

**Implementation Example:**

```typescript
// In ShadeConfigurator.tsx
useEffect(() => {
  const sessionId = generateSessionId();
  analytics.configuratorLoaded({ device_type: isMobile ? 'mobile' : 'desktop' });
  analytics.sessionStart(sessionId);
}, []);
```

#### 2.3.2 Step Navigation Events

**Purpose:** Track user progression through configurator steps

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `step_{N}_viewed` | Step becomes visible | `step_number`, `step_name` | Step views |
| `step_{N}_completed` | User completes step | `step_number`, `time_spent_seconds` | Completion rates |
| `step_opened` | Step accordion opens | `step_number`, `from_step` | Navigation patterns |
| `step_closed` | Step accordion closes | `step_number` | User behavior |
| `next_button_clicked` | Next button click | `current_step`, `next_step`, `is_valid` | Progression tracking |
| `back_button_clicked` | Back button click | `current_step`, `previous_step` | Backward navigation |
| `step_navigation_error` | Invalid step access | `validation_errors_count` | Error tracking |

**Implementation Example:**

```typescript
// In AccordionStep.tsx
const handleStepOpen = () => {
  analytics.stepOpened(stepNumber, stepName, currentStep);
};

const handleNextClick = () => {
  const isValid = validateStep();
  analytics.nextButtonClicked(currentStep, nextStep, isValid);
  if (isValid) {
    analytics.stepCompleted(currentStep, stepName, timeSpent);
  }
};
```

#### 2.3.3 Fabric Selection Events

**Purpose:** Track fabric type and color selection behavior

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `fabric_type_selected` | Fabric type chosen | `fabric_type`, `fabric_label` | Product preference |
| `fabric_color_selected` | Color chosen | `fabric_type`, `fabric_color`, `shade_factor` | Color analytics |
| `fabric_details_viewed` | Details modal opened | `fabric_type` | Interest signals |
| `fabric_link_clicked` | External link clicked | `fabric_type`, `link_url` | External engagement |

**Implementation Example:**

```typescript
// In FabricSelectionContent.tsx
const handleFabricSelect = (fabricType: string) => {
  const fabric = FABRICS.find(f => f.id === fabricType);
  analytics.fabricTypeSelected(fabricType, fabric?.name || '');
  updateConfig({ fabricType });
};

const handleColorSelect = (color: string) => {
  const colorData = getCurrentColors().find(c => c.value === color);
  analytics.fabricColorSelected(
    config.fabricType,
    color,
    colorData?.shadeFactor
  );
  updateConfig({ fabricColor: color });
};
```

#### 2.3.4 Edge Type and Fixing Points Events

**Purpose:** Track structural configuration choices

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `edge_type_selected` | Edge type chosen | `edge_type` | Product configuration |
| `edge_type_details_viewed` | Tooltip viewed | `edge_type` | Help usage |
| `fixing_points_selected` | Corner count chosen | `corners`, `shape_description` | Shape preference |
| `hardware_info_viewed` | Hardware info opened | `corners` | Information seeking |
| `hardware_link_clicked` | Hardware link clicked | `link_url`, `corners` | External links |

**Implementation Example:**

```typescript
// In EdgeTypeContent.tsx
const handleEdgeTypeSelect = (edgeType: string) => {
  analytics.edgeTypeSelected(edgeType);
  updateConfig({ edgeType });
};

// In FixingPointsContent.tsx
const handleCornersSelect = (corners: number) => {
  const shapeDesc = corners === 3 ? 'Triangle' :
                    corners === 4 ? 'Rectangle/Square' :
                    corners === 5 ? 'Pentagon' : 'Hexagon';
  analytics.fixingPointsSelected(corners, shapeDesc);
  updateConfig({ corners });
};
```

#### 2.3.5 Measurement Events

**Purpose:** Track measurement input and validation

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `unit_selected` | Unit system chosen | `unit` | Preference tracking |
| `measurement_option_selected` | Manufacturing option chosen | `measurement_option`, `option_label` | Option popularity |
| `edge_measurement_entered` | Edge value entered | `edge_key`, `measurement_value`, `unit` | Input tracking |
| `diagonal_measurement_entered` | Diagonal value entered | `diagonal_key`, `measurement_value`, `unit` | Diagonal usage |
| `measurement_field_focused` | Field receives focus | `measurement_key`, `measurement_type` | Field interaction |
| `typo_suggestion_shown` | Typo detected | `current_value`, `suggested_value`, `reason` | Validation help |
| `typo_suggestion_accepted` | Suggestion accepted | `old_value`, `new_value` | Correction rate |
| `typo_suggestion_dismissed` | Suggestion rejected | `dismissed_value` | User confidence |
| `perimeter_limit_exceeded` | Size limit reached | `calculated_perimeter`, `max_perimeter` | Constraint tracking |
| `diagonal_validation_error` | Invalid diagonal | `corners`, `error_details` | Geometry errors |

**Implementation Example:**

```typescript
// In DimensionsContent.tsx
const handleMeasurementChange = (key: string, value: number) => {
  const isEdge = key.includes('-');

  if (isEdge) {
    analytics.edgeMeasurementEntered(key, value, config.unit, config.corners);
  } else {
    analytics.diagonalMeasurementEntered(key, value, config.unit, config.corners);
  }

  updateMeasurement(key, value);
};

const showTypoSuggestion = (key: string, current: number, suggested: number) => {
  analytics.typoSuggestionShown(key, current, suggested, 'decimal_placement');
};
```

#### 2.3.6 Height and Anchor Point Events

**Purpose:** Track anchor point configuration

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `anchor_height_entered` | Height value entered | `anchor_point`, `height_value`, `unit` | Height data |
| `fixing_type_selected` | Fixing type chosen | `anchor_point`, `fixing_type` | Installation type |
| `eye_orientation_selected` | Orientation chosen | `anchor_point`, `orientation` | Hardware config |
| `anchor_height_typo_shown` | Height typo detected | `current_value`, `suggested_value` | Validation |
| `anchor_height_typo_accepted` | Height correction | `old_value`, `new_value` | Correction rate |

#### 2.3.7 Price and Calculation Events

**Purpose:** Track pricing calculations and currency changes

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `price_calculated` | Price computed | `total_price`, `currency`, `fabric_cost` | Pricing analytics |
| `area_calculated` | Area computed | `area_sqm`, `area_formatted`, `corners` | Size distribution |
| `perimeter_calculated` | Perimeter computed | `perimeter_m`, `corners` | Size analytics |
| `wire_thickness_calculated` | Wire size determined | `wire_thickness_mm`, `perimeter` | Hardware specs |
| `currency_changed` | Currency switched | `old_currency`, `new_currency`, `price_change` | Currency preference |
| `price_summary_viewed` | Summary displayed | All price components | Review engagement |

**Implementation Example:**

```typescript
// In useShadeCalculations.ts hook
useEffect(() => {
  const calculations = calculatePrice();

  analytics.priceCalculated({
    total_price: calculations.totalPrice,
    currency: config.currency,
    fabric_cost: calculations.fabricCost,
    edge_cost: calculations.edgeCost,
    hardware_cost: calculations.hardwareCost,
    area_sqm: calculations.area,
    perimeter_m: calculations.perimeter,
  });
}, [config]);
```

#### 2.3.8 Quote Save and Email Events

**Purpose:** Track quote saving and email engagement

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `quote_save_modal_opened` | Modal opens | `source`, `device_type`, `total_price` | Modal engagement |
| `quote_save_method_selected` | Email/Link chosen | `method`, `time_to_select_seconds` | Method preference |
| `quote_save_email_entered` | Email provided | `email_domain`, `time_spent_on_email_field` | Email engagement |
| `quote_save_success` | Quote saved | `quote_reference`, `save_method`, `email_domain` | Success rate |
| `quote_save_failed` | Save error | `error_message`, `error_type` | Error tracking |
| `quote_save_modal_cancelled` | Modal closed | `had_selected_method`, `had_entered_email` | Abandonment |
| `quote_link_generated` | Link created | `quote_reference`, `expires_at` | Link generation |
| `quote_link_copied` | Link copied | `quote_reference`, `copy_successful` | Link sharing |
| `pdf_quote_clicked` | PDF download | `total_price`, `currency`, `has_email` | PDF engagement |
| `pdf_generated_success` | PDF created | `file_size_kb`, `generation_time_ms` | PDF performance |
| `email_summary_sent` | Email sent | `email_domain`, `includes_pdf`, `total_price` | Email delivery |

**Implementation Example:**

```typescript
// In SaveQuoteModal.tsx
const handleSave = async () => {
  const startTime = Date.now();

  try {
    const result = await saveQuote(config, calculations, email);
    const modalDuration = (Date.now() - modalOpenTime) / 1000;

    analytics.quoteSaveSuccess({
      quote_reference: result.reference,
      save_method: saveMethod || 'link',
      email_domain: email ? email.split('@')[1] : null,
      total_price: calculations.totalPrice,
      currency: config.currency,
      has_shopify_customer: !!result.shopifyCustomerId,
      shopify_customer_id: result.shopifyCustomerId,
      modal_duration_seconds: modalDuration,
    });
  } catch (error) {
    analytics.quoteSaveFailed({
      error_message: error.message,
      error_type: 'save_error',
      save_method: saveMethod || 'link',
    });
  }
};
```

#### 2.3.9 Shopify Customer Integration Events

**Purpose:** Track Shopify customer creation and updates

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `shopify_customer_created` | New customer created | `customer_id`, `email_domain`, `tags`, `total_quote_value` | Customer acquisition |
| `shopify_customer_creation_failed` | Creation error | `email_domain`, `error_message` | Integration errors |
| `shopify_customer_updated` | Customer updated | `customer_id`, `update_type` | Update tracking |
| `quote_converted_to_cart` | Quote becomes order | `quote_reference`, `time_from_save_to_cart_hours` | Conversion tracking |

**Implementation Example:**

```typescript
// In save-quote Edge Function (Supabase)
const shopifyResult = await createShopifyCustomer(email, quoteData);

if (shopifyResult.success) {
  // Track in frontend after receiving response
  analytics.shopifyCustomerCreated({
    customer_id: shopifyResult.customer.id,
    email_domain: email.split('@')[1],
    source: 'quote_save',
    tags: shopifyResult.customer.tags,
    total_quote_value: calculations.totalPrice,
    currency: config.currency,
  });
}
```

#### 2.3.10 Quote Loading Events

**Purpose:** Track quote retrieval from saved links

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `quote_load_attempted` | Quote URL accessed | `quote_id`, `source` | Load attempts |
| `quote_load_success` | Quote loaded | `quote_reference`, `quote_age_hours`, `total_price` | Load success |
| `quote_load_failed` | Load error | `quote_id`, `error_message` | Load failures |

#### 2.3.11 Canvas and Visualization Events

**Purpose:** Track interactive canvas usage

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `canvas_rendered` | Canvas drawn | `corners`, `canvas_type`, `width`, `height` | Render tracking |
| `canvas_point_dragged` | Point moved | `point_label`, `new_x`, `new_y` | Interaction tracking |
| `canvas_point_hover` | Point hovered | `point_label`, `x`, `y` | Hover behavior |
| `canvas_edge_hover` | Edge hovered | `edge_key`, `measurement_value` | Edge interaction |

#### 2.3.12 Error and Validation Events

**Purpose:** Track user errors and validation issues

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `step_{N}_validation_error` | Step validation fails | `step_number`, `error_type`, `error_message` | Error patterns |
| `validation_error_displayed` | Error shown to user | `step_number`, `error_count` | Error frequency |
| `error_field_scrolled` | Auto-scroll to error | `field_key`, `error_type` | Error handling |

#### 2.3.13 Mobile-Specific Events

**Purpose:** Track mobile user behavior

| Event Name | Trigger | Key Properties | Usage |
|------------|---------|----------------|--------|
| `mobile_view_detected` | Mobile layout active | `screen_width`, `screen_height`, `device_type` | Device tracking |
| `mobile_step_navigation` | Mobile navigation | `current_step`, `interaction_type` | Mobile UX |

### 2.4 Event Property Standards

All events follow these property naming conventions:

| Property Type | Format | Example |
|--------------|--------|---------|
| IDs | `snake_case` | `session_id`, `customer_id`, `quote_reference` |
| Metrics | `snake_case` with units | `time_spent_seconds`, `file_size_kb`, `total_price` |
| Boolean flags | `is_` or `has_` prefix | `is_valid`, `has_email`, `includes_pdf` |
| Enums | `lowercase_with_underscores` | `device_type`, `save_method`, `error_type` |

### 2.5 Testing GA4 Events in Development

#### Enable Debug Mode

1. Install **Google Analytics Debugger** Chrome extension
2. Open Chrome DevTools → Console tab
3. Look for GA4 debug messages with event details
4. Verify event names and properties are correct

#### Use GA4 Debug View

1. Go to GA4 Admin → Data Streams → Select your stream
2. Enable **Debug View** under Configure tag settings
3. Navigate to **Reports → Realtime → Debug View**
4. Trigger events in your app and see them appear in real-time
5. Click events to inspect properties

#### Console Logging

The analytics utility logs all events to console in development:

```typescript
console.log('📊 GA Event:', eventName, properties);
```

Filter console for `📊 GA Event` to see all tracked events.

### 2.6 GA4 Custom Reports Setup

#### Recommended Custom Reports

**1. Configurator Funnel Report**
- **Purpose:** Track step-by-step completion rates
- **Events:** `step_1_completed` → `step_7_completed`
- **Metrics:** Completion rate, time per step, drop-off rate
- **Dimensions:** Device type, fabric type

**2. Quote Conversion Report**
- **Purpose:** Track quote saves and Shopify conversions
- **Events:** `quote_save_success`, `shopify_customer_created`, `quote_converted_to_cart`
- **Metrics:** Save rate, email capture rate, cart conversion rate
- **Dimensions:** Currency, total price ranges

**3. Error Analysis Report**
- **Purpose:** Identify common user errors
- **Events:** All `*_validation_error` and `*_failed` events
- **Metrics:** Error frequency, error resolution rate
- **Dimensions:** Error type, step number

**4. Product Preference Report**
- **Purpose:** Understand product preferences
- **Events:** `fabric_type_selected`, `fabric_color_selected`, `edge_type_selected`
- **Metrics:** Selection counts, average price by fabric
- **Dimensions:** Fabric type, color, edge type, corners

---

## 3. Shopify Customer Integration

### 3.1 Integration Overview

The Shopify customer integration automatically creates or updates customer records in your Shopify store when users save quotes with an email address. This enables:

- **Automatic lead capture** from configurator usage
- **Customer segmentation** with tags based on quote characteristics
- **Quote history tracking** via customer metafields
- **Marketing automation** targeting based on customer data
- **Sales follow-up** with qualified leads

### 3.2 Architecture

The integration uses a Supabase Edge Function (`add-shopify-customer`) that communicates with the Shopify Admin API:

```
SaveQuoteModal (Frontend)
        ↓
save-quote Edge Function (Supabase)
        ↓
add-shopify-customer Edge Function (Supabase)
        ↓
Shopify Admin API (Customers endpoint)
        ↓
Shopify Store Customer Database
```

### 3.3 Customer Creation Workflow

#### Step 1: Email Collection
- User completes configurator and opens "Save Quote" modal
- User selects "Save with Email" option
- User enters email address
- Frontend validates email format

#### Step 2: Quote Save
- Frontend calls `save-quote` Supabase Edge Function
- Quote data saved to `saved_quotes` table in Supabase
- Unique quote reference generated (e.g., `SS-A1B2C3`)
- Expiration date set (default: 30 days)

#### Step 3: Customer Search
- `add-shopify-customer` function called with email and quote data
- Function searches Shopify for existing customer by email
- Uses Shopify Admin API: `GET /admin/api/2025-01/customers/search.json?query=email:{email}`

#### Step 4a: Existing Customer Update
If customer exists:
- Merge new tags with existing tags (no duplicates)
- Update customer metafields with latest quote data
- Use Shopify Admin API: `PUT /admin/api/2025-01/customers/{id}.json`
- Return customer ID and `isNew: false`

#### Step 4b: New Customer Creation
If customer doesn't exist:
- Create new customer record with email
- Set `verified_email: false` (customer not yet verified)
- Set `email_marketing_consent: not_subscribed` (GDPR compliant)
- Add tags for segmentation
- Add metafields with quote data
- Use Shopify Admin API: `POST /admin/api/2025-01/customers.json`
- Return customer ID and `isNew: true`

#### Step 5: Response and Tracking
- Customer ID returned to frontend via `save-quote` response
- GA4 events triggered:
  - `quote_save_success` with `has_shopify_customer: true`
  - `shopify_customer_created` (if new customer)
  - `shopify_customer_updated` (if existing customer)

### 3.4 Customer Tags Strategy

Tags are used for customer segmentation in Shopify. The system automatically applies tags based on quote characteristics:

#### Tag Types

| Tag | Applied When | Purpose |
|-----|--------------|---------|
| `configurator-quote` | Always | Identify all configurator users |
| `high-value-quote` | Total price > threshold | Segment high-value leads |
| `fabric-{type}` | Specific fabric selected | Track fabric preferences |
| `{corners}-corner` | Specific corner count | Track shape preferences |
| `cabled-edge` | Cabled edge selected | Track premium product interest |

#### Tag Implementation

```typescript
// In save-quote Edge Function
const tags: string[] = ['configurator-quote'];

// High-value tag
if (calculations.totalPrice > 3000) {
  tags.push('high-value-quote');
}

// Fabric type tag
tags.push(`fabric-${config.fabricType}`);

// Shape tag
tags.push(`${config.corners}-corner`);

// Edge type tag
if (config.edgeType === 'cabled') {
  tags.push('cabled-edge');
}

// Pass to Shopify customer function
await createShopifyCustomer(email, { tags, ... });
```

#### Using Tags in Shopify

**Customer Segmentation:**
1. Go to Shopify Admin → Customers
2. Use search: `tag:high-value-quote` to filter customers
3. Create customer groups for targeted marketing

**Marketing Automation:**
1. Use Shopify Flow or third-party apps (Klaviyo, Omnisend)
2. Trigger email sequences based on tags
3. Example: Send follow-up email to `high-value-quote` customers after 24 hours

### 3.5 Customer Metafields

Metafields store structured data about the quote on the customer record:

#### Metafield Structure

```typescript
metafields: [
  {
    namespace: 'custom',
    key: 'last_quote_reference',
    value: 'SS-A1B2C3',
    type: 'single_line_text_field'
  },
  {
    namespace: 'custom',
    key: 'last_quote_value',
    value: '3404.50',
    type: 'number_decimal'
  },
  {
    namespace: 'custom',
    key: 'last_quote_currency',
    value: 'NZD',
    type: 'single_line_text_field'
  },
  {
    namespace: 'custom',
    key: 'quote_saved_at',
    value: '2025-10-14T12:30:00Z',
    type: 'date_time'
  }
]
```

#### Metafield Definitions

| Key | Type | Description | Usage |
|-----|------|-------------|-------|
| `last_quote_reference` | Text | Quote reference code | Link to quote details |
| `last_quote_value` | Decimal | Quote total price | Prioritize high-value leads |
| `last_quote_currency` | Text | Currency code | Regional targeting |
| `quote_saved_at` | DateTime | When quote was saved | Follow-up timing |

#### Accessing Metafields in Shopify

**Via Admin UI:**
1. Go to Shopify Admin → Customers
2. Click on a customer
3. Scroll to "Metafields" section
4. View all custom metafields

**Via Liquid Templates:**
```liquid
{{ customer.metafields.custom.last_quote_reference }}
{{ customer.metafields.custom.last_quote_value | money }}
```

**Via Admin API:**
```json
GET /admin/api/2025-01/customers/{id}/metafields.json
```

### 3.6 Customer Note

A human-readable note is added to the customer record:

```typescript
note: `Quote saved: ${quoteReference}`
// Example: "Quote saved: SS-A1B2C3"
```

This note appears in the customer timeline and helps customer service identify configurator-generated leads.

### 3.7 Error Handling and Retry Logic

#### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API token | Check `SHOPIFY_ADMIN_API_TOKEN` |
| `403 Forbidden` | Insufficient API scopes | Add required scopes to Custom App |
| `422 Unprocessable Entity` | Invalid email format | Validate email before sending |
| `429 Rate Limit` | Too many requests | Implement retry with exponential backoff |
| `500 Server Error` | Shopify API issue | Retry request after delay |

#### Retry Implementation

The Edge Function includes automatic retry logic:

```typescript
async function createCustomerWithRetry(payload: any, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(shopifyEndpoint, {
        method: 'POST',
        headers: { /* ... */ },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        // Rate limit - wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      throw new Error(`Shopify API error: ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
}
```

### 3.8 Data Privacy and GDPR Compliance

#### Email Marketing Consent

All customers are created with explicit marketing consent settings:

```typescript
email_marketing_consent: {
  state: 'not_subscribed',
  opt_in_level: 'single_opt_in',
}
```

**Important:** Customers are NOT subscribed to marketing by default. You must obtain explicit consent before sending marketing emails.

#### Data Retention

- Customer records are retained according to Shopify's data policies
- Quote data in Supabase expires after 30 days (configurable)
- You can manually delete customers via Shopify Admin if requested

#### Right to Deletion (GDPR)

If a customer requests data deletion:
1. Delete customer from Shopify Admin
2. Delete corresponding quote records from Supabase `saved_quotes` table
3. Both systems support full data deletion

---

## 4. Environment Configuration (Non-Technical Guide)

This section provides step-by-step instructions for non-technical users to configure the Shopify integration.

### 4.1 Prerequisites

- Shopify store with admin access
- Supabase project with admin access
- 30 minutes to complete setup

### 4.2 Shopify Custom App Setup

#### Step 1: Create Custom App

1. Log in to your **Shopify Admin** dashboard
2. In the left sidebar, click **Apps**
3. Click **App and sales channel settings** at the bottom
4. Click **Develop apps** button (top right)
5. If prompted, click **Allow custom app development**
6. Click **Create an app** button
7. Enter app name: `ShadeSpace Configurator Integration`
8. Select your email as app developer
9. Click **Create app**

#### Step 2: Configure API Scopes

1. In the app configuration page, click **Configure Admin API scopes**
2. Scroll through the scopes list and check the following:

   **Required Scopes:**
   - ☑ `write_customers` - Create and update customers
   - ☑ `read_customers` - Search for existing customers
   - ☑ `write_draft_orders` - Create draft orders (for future use)
   - ☑ `read_draft_orders` - Read draft orders (for future use)

3. Click **Save** button at the bottom

#### Step 3: Install the App

1. Click **Install app** button (top right)
2. Review the permissions
3. Click **Install app** to confirm

#### Step 4: Get Admin API Access Token

1. After installation, you'll see **Admin API access token** section
2. Click **Reveal token once** button
3. **IMPORTANT:** Copy the token immediately and save it securely
   - Token format: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You can only see this token once!
   - If you lose it, you'll need to regenerate it

4. Save the token to a secure location (password manager recommended)

#### Step 5: Note Your Shop Domain

1. Your shop domain is visible in your browser URL
2. Format: `your-store-name.myshopify.com`
3. Example: `shadespace-demo.myshopify.com`
4. Save this domain (you'll need it for Supabase configuration)

### 4.3 Supabase Configuration

#### Step 1: Access Supabase Project Settings

1. Log in to your **Supabase Dashboard**
2. Select your project
3. In the left sidebar, click **Settings** (gear icon)
4. Click **Edge Functions**

#### Step 2: Add Environment Secrets

1. Scroll to **Secrets** section
2. Click **Add new secret** button

**Secret 1: Shopify Shop Domain**
- Name: `SHOPIFY_SHOP_DOMAIN`
- Value: Your shop domain (e.g., `shadespace-demo.myshopify.com`)
- Click **Save**

**Secret 2: Shopify Admin API Token**
- Name: `SHOPIFY_ADMIN_API_TOKEN`
- Value: Your admin API access token (e.g., `shpat_xxxxxxxx`)
- Click **Save**

3. Verify both secrets appear in the secrets list

#### Step 3: Verify Edge Functions

1. In the left sidebar, click **Edge Functions**
2. Verify these functions exist:
   - `save-quote`
   - `add-shopify-customer`
   - `send-email-summary`
   - `generate-pdf`

3. If any functions are missing, contact your developer

### 4.4 Verification Checklist

Use this checklist to verify your setup is complete:

- [ ] Shopify Custom App created and installed
- [ ] App has `write_customers` and `read_customers` scopes
- [ ] Admin API Access Token copied and saved securely
- [ ] Shop domain noted (format: `xxx.myshopify.com`)
- [ ] Supabase secret `SHOPIFY_SHOP_DOMAIN` configured
- [ ] Supabase secret `SHOPIFY_ADMIN_API_TOKEN` configured
- [ ] All 4 Edge Functions present in Supabase

### 4.5 Test the Integration

#### Test 1: Save a Test Quote

1. Open your configurator application
2. Complete all configuration steps
3. Enter test email: `test@example.com`
4. Click **Save Quote**
5. Wait for success message

#### Test 2: Verify Customer in Shopify

1. Go to **Shopify Admin → Customers**
2. Search for `test@example.com`
3. Customer should appear with:
   - Email: `test@example.com`
   - Tags: `configurator-quote`, etc.
   - Note: "Quote saved: SS-XXXXXX"

#### Test 3: Check Metafields

1. Click on the test customer
2. Scroll to **Metafields** section
3. Verify presence of:
   - `last_quote_reference`
   - `last_quote_value`
   - `last_quote_currency`
   - `quote_saved_at`

If all tests pass, your integration is working correctly!

### 4.6 Common Setup Issues

#### Issue: "Shopify API error: 401"

**Cause:** Invalid API token

**Solution:**
1. Go to Shopify Admin → Apps → Your custom app
2. Click **Delete app** and recreate
3. Copy the new token carefully
4. Update Supabase secret with new token

#### Issue: "Shopify API error: 403"

**Cause:** Missing API scopes

**Solution:**
1. Go to Shopify Admin → Apps → Your custom app
2. Click **Edit** on API scopes
3. Verify `write_customers` and `read_customers` are checked
4. Save and reinstall app

#### Issue: Customer not appearing in Shopify

**Cause:** Edge Function not deployed or secrets misconfigured

**Solution:**
1. Verify Edge Functions are deployed in Supabase
2. Check secrets are spelled correctly (case-sensitive)
3. Check shop domain doesn't include `https://`
4. Contact developer for Edge Function logs

---

## 5. Developer Configuration and Setup

### 5.1 Local Development Environment

#### Prerequisites

- Node.js 18+ and npm 9+
- Supabase CLI installed: `npm install -g supabase`
- Git for version control
- Code editor (VS Code recommended)

#### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd shadespace-configurator

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables (see 5.2)
nano .env
```

### 5.2 Environment Variables

#### Frontend (.env)

```bash
# GA4 Configuration
VITE_GA4_MEASUREMENT_ID=G-V8131RB72K

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application Configuration
VITE_APP_URL=http://localhost:5173
VITE_QUOTE_EXPIRY_DAYS=30
```

#### Supabase Edge Functions (Secrets)

Configure these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```bash
# Shopify Integration
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2025-01

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 5.3 Supabase Edge Functions Deployment

#### Deploy All Functions

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy add-shopify-customer
supabase functions deploy save-quote
supabase functions deploy send-email-summary
supabase functions deploy generate-pdf
```

#### Test Function Locally

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve add-shopify-customer --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/add-shopify-customer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "tags": ["configurator-quote"],
    "quoteReference": "SS-TEST123",
    "totalPrice": 1500,
    "currency": "NZD"
  }'
```

### 5.4 Database Migrations

The integration requires these database tables:

#### Saved Quotes Table

Migration file: `supabase/migrations/20251013204352_create_saved_quotes_table.sql`

```sql
CREATE TABLE IF NOT EXISTS saved_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL,
  calculations JSONB NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  shopify_customer_id TEXT
);

-- Enable RLS
ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads for quote loading
CREATE POLICY "Anyone can read quotes by reference"
  ON saved_quotes FOR SELECT
  USING (true);

-- Allow anonymous inserts for quote saving
CREATE POLICY "Anyone can insert quotes"
  ON saved_quotes FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_saved_quotes_reference ON saved_quotes(reference);
CREATE INDEX idx_saved_quotes_email ON saved_quotes(email);
CREATE INDEX idx_saved_quotes_expires_at ON saved_quotes(expires_at);
```

#### Shopify Customer Tracking

Migration file: `supabase/migrations/20251014001500_add_shopify_customer_tracking.sql`

```sql
-- Add shopify_customer_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'shopify_customer_id'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN shopify_customer_id TEXT;
  END IF;
END $$;

-- Create index for Shopify customer lookups
CREATE INDEX IF NOT EXISTS idx_saved_quotes_shopify_customer
  ON saved_quotes(shopify_customer_id);

-- Add notes column for additional metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN notes TEXT;
  END IF;
END $$;
```

#### Apply Migrations

```bash
# Apply migrations locally
supabase db reset

# Apply migrations to production
supabase db push
```

### 5.5 CORS Configuration

Ensure your production domain is allowed in Edge Functions:

```typescript
// In all Edge Functions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Change to your domain in production
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

**Production Configuration:**

```typescript
const allowedOrigins = [
  'https://shadespace.com',
  'https://www.shadespace.com',
  'http://localhost:5173', // Development
];

const origin = req.headers.get('origin');
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

### 5.6 TypeScript Type Definitions

Ensure type safety with these interfaces:

```typescript
// src/types/index.ts

export interface ShopifyCustomer {
  id: string;
  email: string;
  isNew: boolean;
  tags: string[];
}

export interface SaveQuoteResult {
  id: string;
  reference: string;
  expiresAt: string;
  shopifyCustomerId?: string;
}

export interface ShopifyMetafield {
  namespace: string;
  key: string;
  value: string;
  type: 'single_line_text_field' | 'number_decimal' | 'date_time';
}
```

### 5.7 Development Workflow

1. **Make code changes** in your local environment
2. **Test locally** with `npm run dev`
3. **Test Edge Functions** with `supabase functions serve`
4. **Run type checking** with `npm run lint`
5. **Commit changes** to Git
6. **Deploy Edge Functions** with `supabase functions deploy`
7. **Build production** with `npm run build`
8. **Deploy frontend** to your hosting platform

---

## 6. Code Integration Points

### 6.1 Analytics Utility (src/utils/analytics.ts)

**Purpose:** Central hub for all GA4 event tracking

**Key Features:**
- Type-safe event tracking with TypeScript
- Automatic console logging in development
- Graceful degradation if GA4 not loaded
- 70+ pre-defined event functions

**Usage Pattern:**

```typescript
import { analytics } from '../utils/analytics';

// Track simple event
analytics.fabricTypeSelected('monotec370', 'Monotec 370');

// Track event with complex properties
analytics.quoteSaveSuccess({
  quote_reference: 'SS-A1B2C3',
  save_method: 'email',
  email_domain: 'gmail.com',
  total_price: 3404.50,
  currency: 'NZD',
  has_shopify_customer: true,
  shopify_customer_id: '123456789',
});
```

**Adding New Events:**

```typescript
// In src/utils/analytics.ts
export const analytics = {
  // ... existing events ...

  // Add new event
  customEventName: (param1: string, param2: number) => {
    trackEvent('custom_event_name', {
      parameter_1: param1,
      parameter_2: param2,
      timestamp: new Date().toISOString(),
    });
  },
};
```

### 6.2 SaveQuoteModal Component (src/components/SaveQuoteModal.tsx)

**Purpose:** UI for saving quotes and capturing email addresses

**Key Integration Points:**

```typescript
// Track modal open
useEffect(() => {
  if (isOpen) {
    analytics.quoteSaveModalOpened({
      source: 'review_content',
      device_type: isMobile ? 'mobile' : 'desktop',
      total_price: calculations.totalPrice,
      currency: config.currency,
    });
  }
}, [isOpen]);

// Track save success with Shopify customer ID
const handleSave = async () => {
  const result = await saveQuote(config, calculations, email);

  analytics.quoteSaveSuccess({
    quote_reference: result.reference,
    save_method: saveMethod || 'link',
    has_shopify_customer: !!result.shopifyCustomerId,
    shopify_customer_id: result.shopifyCustomerId, // From Shopify
  });

  if (result.shopifyCustomerId) {
    analytics.shopifyCustomerCreated({
      customer_id: result.shopifyCustomerId,
      email_domain: email.split('@')[1],
      source: 'quote_save',
    });
  }
};
```

### 6.3 Quote Manager (src/utils/quoteManager.ts)

**Purpose:** Handles quote saving and loading via Supabase

**Key Functions:**

```typescript
export async function saveQuote(
  config: ConfiguratorState,
  calculations: ShadeCalculations,
  email?: string
): Promise<SaveQuoteResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Call save-quote Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/save-quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      config,
      calculations,
      email,
    }),
  });

  const data = await response.json();
  return {
    id: data.id,
    reference: data.reference,
    expiresAt: data.expires_at,
    shopifyCustomerId: data.shopify_customer_id, // Returned from Edge Function
  };
}
```

### 6.4 Save Quote Edge Function (supabase/functions/save-quote/index.ts)

**Purpose:** Saves quote to database and creates Shopify customer

**Key Logic:**

```typescript
Deno.serve(async (req: Request) => {
  const { config, calculations, email } = await req.json();

  // Save to database
  const { data: quote, error } = await supabase
    .from('saved_quotes')
    .insert({
      reference: generateReference(),
      config,
      calculations,
      email,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .select()
    .single();

  let shopifyCustomerId = null;

  // Create Shopify customer if email provided
  if (email) {
    try {
      const shopifyResponse = await fetch(
        `${supabaseUrl}/functions/v1/add-shopify-customer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            email,
            tags: generateTags(config, calculations),
            quoteReference: quote.reference,
            totalPrice: calculations.totalPrice,
            currency: config.currency,
          }),
        }
      );

      const shopifyData = await shopifyResponse.json();
      if (shopifyData.success) {
        shopifyCustomerId = shopifyData.customer.id;

        // Update quote with Shopify customer ID
        await supabase
          .from('saved_quotes')
          .update({ shopify_customer_id: shopifyCustomerId })
          .eq('id', quote.id);
      }
    } catch (error) {
      console.error('Shopify customer creation failed:', error);
      // Continue even if Shopify fails - quote is still saved
    }
  }

  return new Response(
    JSON.stringify({
      id: quote.id,
      reference: quote.reference,
      expires_at: quote.expires_at,
      shopify_customer_id: shopifyCustomerId,
    }),
    { headers: corsHeaders }
  );
});
```

### 6.5 Add Shopify Customer Edge Function (supabase/functions/add-shopify-customer/index.ts)

**Purpose:** Creates or updates customer in Shopify

**Full Implementation:**

See [Section 9.1](#91-add-shopify-customer-edge-function) for complete API reference.

**Key Logic:**

```typescript
// Search for existing customer
const searchUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers/search.json?query=email:${encodeURIComponent(email)}`;

const searchResponse = await fetch(searchUrl, {
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
    'Content-Type': 'application/json',
  },
});

const searchData = await searchResponse.json();

if (searchData.customers && searchData.customers.length > 0) {
  // Update existing customer
  const customer = searchData.customers[0];
  const allTags = [...new Set([...existingTags, ...newTags])];

  await fetch(`${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers/${customer.id}.json`, {
    method: 'PUT',
    body: JSON.stringify({
      customer: {
        id: customer.id,
        tags: allTags.join(', '),
        metafields: newMetafields,
      },
    }),
  });
} else {
  // Create new customer
  await fetch(`${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/customers.json`, {
    method: 'POST',
    body: JSON.stringify({
      customer: {
        email,
        tags: tags.join(', '),
        metafields: metafields,
        verified_email: false,
        email_marketing_consent: {
          state: 'not_subscribed',
        },
      },
    }),
  });
}
```

### 6.6 Component-Level Tracking Examples

#### Fabric Selection Tracking

```typescript
// In FabricSelectionContent.tsx
const handleFabricSelect = (fabricId: string) => {
  const fabric = FABRICS.find(f => f.id === fabricId);

  analytics.fabricTypeSelected(fabricId, fabric?.name || '');

  updateConfig({ fabricType: fabricId });
};

const handleColorSelect = (color: string) => {
  const colorData = getCurrentColors().find(c => c.value === color);

  analytics.fabricColorSelected(
    config.fabricType,
    color,
    colorData?.shadeFactor
  );

  updateConfig({ fabricColor: color });
};
```

#### Measurement Tracking

```typescript
// In DimensionsContent.tsx
const handleMeasurementChange = (key: string, value: number) => {
  const isEdge = key.includes('-');

  if (isEdge) {
    analytics.edgeMeasurementEntered(
      key,
      value,
      config.unit,
      config.corners
    );
  } else {
    analytics.diagonalMeasurementEntered(
      key,
      value,
      config.unit,
      config.corners
    );
  }

  updateMeasurements({ [key]: value });
};
```

#### Step Navigation Tracking

```typescript
// In AccordionStep.tsx
const handleStepOpen = () => {
  analytics.stepOpened(stepNumber, stepName, currentOpenStep);
  setIsOpen(true);
};

const handleStepComplete = () => {
  const timeSpent = (Date.now() - stepStartTime) / 1000;

  analytics.stepCompleted(
    stepNumber,
    stepName,
    timeSpent,
    { valid: isValid }
  );

  moveToNextStep();
};
```

---

## 7. Testing and Verification

### 7.1 GA4 Event Testing

#### Method 1: Chrome DevTools Console

1. Open configurator in Chrome
2. Open DevTools (F12) → Console tab
3. Filter for "📊 GA Event"
4. Perform actions in configurator
5. Verify events appear in console with correct properties

**Expected Output:**
```
📊 GA Event: fabric_type_selected {fabric_type: "monotec370", fabric_label: "Monotec 370"}
📊 GA Event: fabric_color_selected {fabric_type: "monotec370", fabric_color: "Koonunga Green", shade_factor: 98}
```

#### Method 2: GA4 DebugView

1. Install **Google Analytics Debugger** Chrome extension
2. Enable the extension (icon turns green)
3. Open GA4 → Admin → DebugView
4. Use configurator in another tab
5. Events appear in DebugView in real-time

**Verification Steps:**
- Event names match expected names (e.g., `fabric_type_selected`)
- Event parameters are present and correctly formatted
- User properties are set correctly
- No errors in event processing

#### Method 3: GA4 Realtime Reports

1. Go to GA4 → Reports → Realtime
2. Open configurator
3. You should appear as active user
4. Click on event count to see event details
5. Verify events are being tracked

### 7.2 Shopify Customer Integration Testing

#### Test 1: New Customer Creation

**Setup:**
```bash
# Use a unique test email
EMAIL="test-$(date +%s)@example.com"
```

**Steps:**
1. Complete configurator configuration
2. Click "Save Quote"
3. Select "Save with Email"
4. Enter the test email
5. Click "Save"
6. Wait for success message

**Verification:**
1. Go to Shopify Admin → Customers
2. Search for test email
3. Customer should exist with:
   - ✓ Email matches
   - ✓ Tags include `configurator-quote`
   - ✓ Note includes quote reference
   - ✓ Metafields present (scroll down)

**Expected Metafields:**
- `custom.last_quote_reference`: "SS-XXXXXX"
- `custom.last_quote_value`: Price amount
- `custom.last_quote_currency`: "NZD" or selected currency
- `custom.quote_saved_at`: ISO timestamp

#### Test 2: Existing Customer Update

**Steps:**
1. Use the same email from Test 1
2. Create a different configuration
3. Save quote with same email
4. Verify update in Shopify

**Verification:**
1. Search for customer in Shopify
2. Check that:
   - ✓ Tags remain (no duplicates added)
   - ✓ Metafields updated with new quote data
   - ✓ `last_quote_reference` changed to new reference
   - ✓ `last_quote_value` updated to new price
   - ✓ `quote_saved_at` updated to new timestamp

#### Test 3: High-Value Quote Tagging

**Steps:**
1. Configure expensive shade sail (high fabric cost, large size)
2. Ensure total price > $3000 (or your threshold)
3. Save quote with email

**Verification:**
1. Check customer tags include:
   - ✓ `configurator-quote`
   - ✓ `high-value-quote`
   - ✓ Fabric-specific tag (e.g., `fabric-monotec370`)
   - ✓ Corner count tag (e.g., `4-corner`)

### 7.3 Supabase Edge Function Testing

#### Test add-shopify-customer Function

```bash
# Get your Supabase URL and anon key
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

# Test customer creation
curl -X POST "${SUPABASE_URL}/functions/v1/add-shopify-customer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "curl-test@example.com",
    "tags": ["configurator-quote", "test-tag"],
    "quoteReference": "SS-TEST001",
    "totalPrice": 1500.00,
    "currency": "NZD"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "customer": {
    "id": "7234567890123",
    "email": "curl-test@example.com",
    "isNew": true,
    "tags": ["configurator-quote", "test-tag"]
  }
}
```

#### Test save-quote Function

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/save-quote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "config": {
      "fabricType": "monotec370",
      "fabricColor": "Koonunga Green",
      "edgeType": "webbing",
      "corners": 4,
      "currency": "NZD"
    },
    "calculations": {
      "totalPrice": 2500.00,
      "area": 15.5,
      "perimeter": 16.0
    },
    "email": "save-test@example.com"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "reference": "SS-A1B2C3",
  "expires_at": "2025-11-13T12:00:00Z",
  "shopify_customer_id": "7234567890123"
}
```

### 7.4 Integration Test Suite

Create an automated test script:

```typescript
// test/integration.test.ts
import { test, expect } from '@playwright/test';

test.describe('GA4 and Shopify Integration', () => {

  test('should track fabric selection event', async ({ page }) => {
    const events: any[] = [];

    // Intercept GA4 events
    await page.route('https://www.google-analytics.com/**', route => {
      events.push(route.request().postDataJSON());
      route.fulfill({ status: 200 });
    });

    await page.goto('http://localhost:5173');

    // Select fabric
    await page.click('[data-fabric="monotec370"]');

    // Wait for event
    await page.waitForTimeout(1000);

    // Verify event tracked
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'fabric_type_selected',
        fabric_type: 'monotec370',
      })
    );
  });

  test('should create Shopify customer on quote save', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Complete configuration (abbreviated)
    // ... configure shade sail ...

    // Save quote
    await page.click('[data-testid="save-quote-button"]');
    await page.fill('[data-testid="email-input"]', 'playwright@test.com');
    await page.click('[data-testid="save-button"]');

    // Wait for success
    await page.waitForSelector('[data-testid="success-message"]');

    // Verify customer in Shopify (requires Shopify API call)
    const response = await page.request.get(
      `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2025-01/customers/search.json?query=email:playwright@test.com`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN!,
        },
      }
    );

    const data = await response.json();
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].email).toBe('playwright@test.com');
  });
});
```

### 7.5 Production Deployment Checklist

Before deploying to production, verify:

**Frontend:**
- [ ] GA4 Measurement ID is correct in `index.html`
- [ ] GA4 Measurement ID matches analytics.ts config
- [ ] Environment variables set in hosting platform
- [ ] Build completes without errors (`npm run build`)
- [ ] All TypeScript errors resolved
- [ ] Console logs removed from production build

**Supabase:**
- [ ] All Edge Functions deployed to production project
- [ ] Secrets configured in production Supabase project
- [ ] CORS headers allow production domain
- [ ] Database migrations applied
- [ ] RLS policies enabled on saved_quotes table

**Shopify:**
- [ ] Custom App installed with correct scopes
- [ ] Admin API token saved securely
- [ ] Shop domain correct in Supabase secrets
- [ ] Test customer creation works from production

**Testing:**
- [ ] End-to-end test completed in production
- [ ] GA4 events visible in Realtime reports
- [ ] Test customer created in Shopify
- [ ] Quote saved and loaded successfully
- [ ] Email summary sent (if configured)

**Monitoring:**
- [ ] GA4 alerts configured for error events
- [ ] Supabase logs monitoring enabled
- [ ] Shopify webhook monitoring (if applicable)
- [ ] Error tracking service configured (Sentry, etc.)

---

## 8. Migration and Updates

### 8.1 Updating GA4 Measurement ID

If you need to change the GA4 Measurement ID (e.g., switching to a different GA4 property):

#### Step 1: Update index.html

File: `index.html`

```html
<!-- Find this line -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-OLD-ID"></script>

<!-- Replace with new ID -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-NEW-ID"></script>

<!-- Also update the config call -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-NEW-ID'); // Update here too
</script>
```

#### Step 2: Update analytics.ts (if ID is used)

File: `src/utils/analytics.ts`

```typescript
// Find this function
export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (window.gtag) {
    window.gtag('config', 'G-OLD-ID', { // Update this
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

// Replace with
export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (window.gtag) {
    window.gtag('config', 'G-NEW-ID', { // New ID here
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};
```

#### Step 3: Update Environment Variables (Optional)

If you want to make the ID configurable:

```bash
# .env
VITE_GA4_MEASUREMENT_ID=G-NEW-ID
```

```typescript
// src/utils/analytics.ts
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-NEW-ID';

export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (window.gtag) {
    window.gtag('config', GA4_ID, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};
```

```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=%VITE_GA4_MEASUREMENT_ID%"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '%VITE_GA4_MEASUREMENT_ID%');
</script>
```

**Note:** Vite environment variable substitution in HTML only works with specific build configurations.

#### Step 4: Test and Deploy

```bash
# Test locally
npm run dev

# Verify events in new GA4 property
# Check GA4 DebugView with new property ID

# Build for production
npm run build

# Deploy
```

#### Step 5: Transition Period (Optional)

To track to both old and new properties during transition:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-OLD-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-OLD-ID');
  gtag('config', 'G-NEW-ID'); // Send to both properties
</script>
```

### 8.2 Shopify API Version Upgrade

Shopify releases new API versions quarterly. To upgrade:

#### Step 1: Check Current Version

Current version: `2025-01` (January 2025 release)

File: `supabase/functions/add-shopify-customer/index.ts`

```typescript
const SHOPIFY_API_VERSION = "2025-01";
```

#### Step 2: Review Shopify Changelog

1. Visit [Shopify API Release Notes](https://shopify.dev/docs/api/release-notes)
2. Review breaking changes in new version
3. Check if any endpoints used have changed

**Endpoints Used:**
- `GET /admin/api/{version}/customers/search.json`
- `POST /admin/api/{version}/customers.json`
- `PUT /admin/api/{version}/customers/{id}.json`

#### Step 3: Update Edge Function

File: `supabase/functions/add-shopify-customer/index.ts`

```typescript
// Change this line
const SHOPIFY_API_VERSION = "2025-01";

// To new version
const SHOPIFY_API_VERSION = "2025-04"; // Example: April 2025 release
```

#### Step 4: Test in Development

```bash
# Deploy to test environment
supabase functions deploy add-shopify-customer --project-ref test-project

# Test customer creation
curl -X POST "https://test-project.supabase.co/functions/v1/add-shopify-customer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "version-test@example.com",
    "tags": ["test"],
    "quoteReference": "SS-TEST",
    "totalPrice": 1000,
    "currency": "NZD"
  }'

# Verify customer created in Shopify
```

#### Step 5: Deploy to Production

```bash
# Deploy updated function
supabase functions deploy add-shopify-customer --project-ref production-project

# Monitor logs
supabase functions logs add-shopify-customer --project-ref production-project

# Test with real quote save
```

#### Step 6: Rollback Plan

If issues occur:

```bash
# Revert function code to previous version
git checkout HEAD~1 supabase/functions/add-shopify-customer/index.ts

# Redeploy
supabase functions deploy add-shopify-customer
```

**Version Compatibility:**

Shopify maintains API versions for at least 12 months. You can safely delay upgrades within this window, but plan migrations before deprecation.

### 8.3 Metafields Structure Migration

If you need to change the metafields stored on customers:

#### Scenario: Adding New Metafield

**Current Metafields:**
- `custom.last_quote_reference`
- `custom.last_quote_value`
- `custom.last_quote_currency`
- `custom.quote_saved_at`

**New Metafield to Add:**
- `custom.quote_fabric_type`

#### Step 1: Update Edge Function

File: `supabase/functions/add-shopify-customer/index.ts`

```typescript
// Find metafields array
const customerMetafields: any[] = metafields || [];

if (quoteReference || totalPrice) {
  customerMetafields.push(
    // ... existing metafields ...
    {
      namespace: "custom",
      key: "quote_fabric_type",
      value: fabricType || "", // New field
      type: "single_line_text_field",
    }
  );
}
```

#### Step 2: Update save-quote Function

Pass fabric type to add-shopify-customer:

File: `supabase/functions/save-quote/index.ts`

```typescript
const shopifyResponse = await fetch(
  `${supabaseUrl}/functions/v1/add-shopify-customer`,
  {
    method: 'POST',
    body: JSON.stringify({
      email,
      tags: generateTags(config, calculations),
      quoteReference: quote.reference,
      totalPrice: calculations.totalPrice,
      currency: config.currency,
      fabricType: config.fabricType, // Add this
    }),
  }
);
```

#### Step 3: Update TypeScript Interfaces

```typescript
// src/types/index.ts
export interface ShopifyCustomerPayload {
  email: string;
  tags: string[];
  quoteReference?: string;
  totalPrice?: number;
  currency?: string;
  fabricType?: string; // Add this
}
```

#### Step 4: Existing Customers

Existing customers won't have the new metafield. Options:

**Option A: Automatic Backfill on Next Update**
- When customer saves a new quote, new metafield is added
- No action needed

**Option B: Bulk Update Script**
- Create script to update all existing customers
- Use Shopify Admin API to add metafield to all customers with `configurator-quote` tag

```typescript
// bulk-update-metafields.ts
async function bulkUpdateCustomers() {
  // Get all customers with configurator-quote tag
  const customers = await shopify.customer.search({
    query: 'tag:configurator-quote',
  });

  for (const customer of customers) {
    // Fetch their latest quote from Supabase
    const quote = await supabase
      .from('saved_quotes')
      .select('*')
      .eq('email', customer.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (quote) {
      // Update customer with new metafield
      await shopify.customer.update(customer.id, {
        metafields: [
          {
            namespace: 'custom',
            key: 'quote_fabric_type',
            value: quote.config.fabricType,
            type: 'single_line_text_field',
          },
        ],
      });
    }
  }
}
```

### 8.4 Database Schema Changes

If you need to modify the `saved_quotes` table structure:

#### Example: Adding a new column

**Create Migration File:**

```bash
# Create new migration
supabase migration new add_customer_name_to_saved_quotes
```

**Migration SQL:**

File: `supabase/migrations/20251015_add_customer_name_to_saved_quotes.sql`

```sql
/*
  # Add customer name fields to saved_quotes

  1. Changes
    - Add first_name column
    - Add last_name column
    - Add index on email for faster lookups

  2. Notes
    - Columns are nullable for backward compatibility
    - Existing quotes will have NULL values
*/

-- Add columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN first_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN last_name TEXT;
  END IF;
END $$;

-- Add index if not exists
CREATE INDEX IF NOT EXISTS idx_saved_quotes_customer_name
  ON saved_quotes(first_name, last_name);
```

**Apply Migration:**

```bash
# Apply to local development
supabase db reset

# Apply to production
supabase db push
```

**Update TypeScript Types:**

```typescript
// src/types/index.ts
export interface SavedQuote {
  id: string;
  reference: string;
  config: ConfiguratorState;
  calculations: ShadeCalculations;
  email?: string;
  first_name?: string; // Add this
  last_name?: string;  // Add this
  created_at: string;
  expires_at: string;
  shopify_customer_id?: string;
}
```

**Update Frontend:**

```typescript
// SaveQuoteModal.tsx
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');

const handleSave = async () => {
  await saveQuote(config, calculations, email, firstName, lastName);
};
```

### 8.5 Rollback Procedures

#### Rollback Edge Function Deployment

```bash
# View deployment history
supabase functions list --project-ref production-project

# Rollback to previous version
git checkout <previous-commit-hash> supabase/functions/add-shopify-customer/

# Redeploy previous version
supabase functions deploy add-shopify-customer --project-ref production-project
```

#### Rollback Database Migration

```bash
# Create down migration
supabase migration new rollback_add_customer_name
```

```sql
-- Remove columns added in previous migration
ALTER TABLE saved_quotes DROP COLUMN IF EXISTS first_name;
ALTER TABLE saved_quotes DROP COLUMN IF EXISTS last_name;
DROP INDEX IF EXISTS idx_saved_quotes_customer_name;
```

```bash
# Apply rollback
supabase db push
```

#### Rollback Frontend Changes

```bash
# Revert to previous version
git revert <commit-hash>

# Or checkout previous version
git checkout <previous-tag>

# Rebuild and deploy
npm run build
```

---

## 9. API Reference

### 9.1 add-shopify-customer Edge Function

**Endpoint:** `POST /functions/v1/add-shopify-customer`

**Purpose:** Creates a new customer or updates an existing customer in Shopify with quote metadata

#### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Body:**
```typescript
{
  email: string;                    // Required: Customer email
  firstName?: string;                // Optional: Customer first name
  lastName?: string;                 // Optional: Customer last name
  tags: string[];                    // Required: Tags to apply to customer
  metafields?: Array<{              // Optional: Additional metafields
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
  quoteReference?: string;           // Optional: Quote reference code
  totalPrice?: number;               // Optional: Quote total price
  currency?: string;                 // Optional: Currency code (default: NZD)
}
```

**Example Request:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/add-shopify-customer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{
    "email": "customer@example.com",
    "tags": ["configurator-quote", "high-value-quote", "fabric-monotec370"],
    "quoteReference": "SS-A1B2C3",
    "totalPrice": 3500.00,
    "currency": "NZD"
  }'
```

#### Response

**Success (200):**
```typescript
{
  success: true;
  customer: {
    id: string;          // Shopify customer ID
    email: string;       // Customer email
    isNew: boolean;      // true if newly created, false if updated
    tags: string[];      // All tags on customer (including existing)
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "customer": {
    "id": "7234567890123",
    "email": "customer@example.com",
    "isNew": true,
    "tags": ["configurator-quote", "high-value-quote", "fabric-monotec370"]
  }
}
```

**Error (400/500):**
```typescript
{
  success: false;
  error: string;       // Error message
}
```

**Example Error:**
```json
{
  "success": false,
  "error": "Email is required"
}
```

#### Error Codes

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | "Email is required" | Missing email in request | Provide valid email |
| 401 | "Unauthorized" | Invalid Supabase key | Check Authorization header |
| 405 | "Method not allowed" | Wrong HTTP method | Use POST |
| 500 | "Shopify integration not configured" | Missing Shopify credentials | Configure Supabase secrets |
| 500 | "Shopify API error: 401" | Invalid Shopify token | Regenerate Shopify token |
| 500 | "Shopify API error: 403" | Missing API scopes | Add required scopes to Custom App |
| 500 | "Shopify search failed" | Shopify API issue | Check Shopify status, retry |

#### Automatic Metafields

When `quoteReference` or `totalPrice` are provided, these metafields are automatically created:

```typescript
[
  {
    namespace: "custom",
    key: "last_quote_reference",
    value: quoteReference,
    type: "single_line_text_field"
  },
  {
    namespace: "custom",
    key: "last_quote_value",
    value: totalPrice.toString(),
    type: "number_decimal"
  },
  {
    namespace: "custom",
    key: "last_quote_currency",
    value: currency,
    type: "single_line_text_field"
  },
  {
    namespace: "custom",
    key: "quote_saved_at",
    value: new Date().toISOString(),
    type: "date_time"
  }
]
```

### 9.2 save-quote Edge Function

**Endpoint:** `POST /functions/v1/save-quote`

**Purpose:** Saves quote configuration to database and optionally creates Shopify customer

#### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Body:**
```typescript
{
  config: ConfiguratorState;         // Required: Full configuration object
  calculations: ShadeCalculations;   // Required: Pricing calculations
  email?: string;                    // Optional: Customer email
}
```

**ConfiguratorState Interface:**
```typescript
interface ConfiguratorState {
  fabricType: string;                // e.g., "monotec370"
  fabricColor: string;               // e.g., "Koonunga Green"
  edgeType: 'webbing' | 'cabled';   // Edge reinforcement type
  corners: 3 | 4 | 5 | 6;           // Number of fixing points
  unit: 'metric' | 'imperial';      // Measurement system
  measurementOption: 'adjust' | 'exact'; // Manufacturing option
  measurements: {                    // All edge and diagonal measurements
    [key: string]: number;          // e.g., "AB": 3000
  };
  fixingHeights: number[];          // Height of each anchor point
  fixingTypes: ('post' | 'building')[]; // Type of each anchor
  eyeOrientations: ('horizontal' | 'vertical')[]; // Eye orientation
  currency: string;                 // Currency code
}
```

**ShadeCalculations Interface:**
```typescript
interface ShadeCalculations {
  totalPrice: number;               // Total price in selected currency
  fabricCost: number;               // Fabric material cost
  edgeCost: number;                 // Edge reinforcement cost
  hardwareCost: number;             // Hardware cost
  area: number;                     // Area in square meters
  perimeter: number;                // Perimeter in meters
  webbingWidth?: number;            // Webbing width if applicable
  wireThickness?: number;           // Wire thickness if applicable
}
```

**Example Request:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/save-quote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{
    "config": {
      "fabricType": "monotec370",
      "fabricColor": "Koonunga Green",
      "edgeType": "webbing",
      "corners": 4,
      "unit": "metric",
      "measurementOption": "adjust",
      "measurements": {
        "AB": 3000,
        "BC": 4000,
        "CD": 3000,
        "DA": 4000,
        "AC": 5000,
        "BD": 5000
      },
      "fixingHeights": [2500, 3000, 2800, 2700],
      "fixingTypes": ["post", "building", "post", "building"],
      "eyeOrientations": ["horizontal", "vertical", "horizontal", "vertical"],
      "currency": "NZD"
    },
    "calculations": {
      "totalPrice": 3404.50,
      "fabricCost": 2400.00,
      "edgeCost": 0,
      "hardwareCost": 1004.50,
      "area": 12.0,
      "perimeter": 14.0,
      "webbingWidth": 50
    },
    "email": "customer@example.com"
  }'
```

#### Response

**Success (200):**
```typescript
{
  id: string;                       // Quote UUID
  reference: string;                // Human-readable reference (e.g., "SS-A1B2C3")
  expires_at: string;               // ISO timestamp of expiration
  shopify_customer_id?: string;     // Shopify customer ID (if email provided)
}
```

**Example Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "reference": "SS-A1B2C3",
  "expires_at": "2025-11-13T12:00:00Z",
  "shopify_customer_id": "7234567890123"
}
```

**Error (400/500):**
```typescript
{
  success: false;
  error: string;
}
```

#### Behavior

1. **Quote Save:**
   - Quote is saved to `saved_quotes` table
   - Unique reference generated (format: `SS-{6 chars}`)
   - Expiration set to 30 days from creation

2. **Email Provided:**
   - Calls `add-shopify-customer` function
   - Creates/updates customer in Shopify
   - Returns customer ID in response
   - If Shopify fails, quote is still saved

3. **No Email:**
   - Quote saved without customer association
   - No Shopify API call made
   - User can still load quote via link

### 9.3 load-quote Endpoint

**Method:** Database query (not an Edge Function)

**Purpose:** Retrieve saved quote by reference code

#### Frontend Implementation

```typescript
// src/utils/quoteManager.ts
export async function loadQuote(reference: string): Promise<SavedQuote | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('saved_quotes')
    .select('*')
    .eq('reference', reference)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return null; // Quote expired
  }

  return data;
}
```

#### Usage

```typescript
// In ShadeConfigurator.tsx
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const quoteRef = urlParams.get('quote');

  if (quoteRef) {
    loadQuote(quoteRef).then(quote => {
      if (quote) {
        // Restore configuration
        updateConfig(quote.config);

        // Track load success
        analytics.quoteLoadSuccess({
          quote_reference: quote.reference,
          quote_age_hours: (Date.now() - new Date(quote.created_at).getTime()) / (1000 * 60 * 60),
          had_email: !!quote.email,
          total_price: quote.calculations.totalPrice,
          currency: quote.config.currency,
        });
      } else {
        // Track load failure
        analytics.quoteLoadFailed({
          quote_id: quoteRef,
          error_message: 'Quote not found or expired',
          error_type: 'not_found',
        });
      }
    });
  }
}, []);
```

### 9.4 Shopify Admin API Endpoints Used

#### Customer Search

**Endpoint:** `GET /admin/api/{version}/customers/search.json`

**Query Parameters:**
```
query: string  // Search query (e.g., "email:customer@example.com")
```

**Response:**
```json
{
  "customers": [
    {
      "id": 7234567890123,
      "email": "customer@example.com",
      "first_name": null,
      "last_name": null,
      "tags": "configurator-quote, high-value-quote",
      "note": "Quote saved: SS-A1B2C3",
      "verified_email": false,
      "created_at": "2025-10-14T12:00:00Z",
      "updated_at": "2025-10-14T12:00:00Z"
    }
  ]
}
```

#### Customer Create

**Endpoint:** `POST /admin/api/{version}/customers.json`

**Request Body:**
```json
{
  "customer": {
    "email": "customer@example.com",
    "tags": "configurator-quote, high-value-quote",
    "verified_email": false,
    "email_marketing_consent": {
      "state": "not_subscribed",
      "opt_in_level": "single_opt_in"
    },
    "note": "Quote saved: SS-A1B2C3",
    "metafields": [
      {
        "namespace": "custom",
        "key": "last_quote_reference",
        "value": "SS-A1B2C3",
        "type": "single_line_text_field"
      }
    ]
  }
}
```

**Response:**
```json
{
  "customer": {
    "id": 7234567890123,
    "email": "customer@example.com",
    "created_at": "2025-10-14T12:00:00Z"
  }
}
```

#### Customer Update

**Endpoint:** `PUT /admin/api/{version}/customers/{id}.json`

**Request Body:**
```json
{
  "customer": {
    "id": 7234567890123,
    "tags": "configurator-quote, high-value-quote, fabric-monotec370",
    "metafields": [
      {
        "namespace": "custom",
        "key": "last_quote_value",
        "value": "3500.00",
        "type": "number_decimal"
      }
    ]
  }
}
```

**Response:**
```json
{
  "customer": {
    "id": 7234567890123,
    "updated_at": "2025-10-14T13:00:00Z"
  }
}
```

---

## 10. Monitoring and Analytics

### 10.1 GA4 Dashboard Setup

#### Recommended Custom Dimensions

Create these custom dimensions in GA4 Admin → Data display → Custom definitions:

| Dimension Name | Parameter Name | Scope |
|----------------|----------------|-------|
| `Session ID` | `session_id` | Event |
| `Quote Reference` | `quote_reference` | Event |
| `Shopify Customer ID` | `shopify_customer_id` | User |
| `Fabric Type` | `fabric_type` | Event |
| `Edge Type` | `edge_type` | Event |
| `Corner Count` | `corners` | Event |
| `Currency` | `currency` | Event |
| `Device Type` | `device_type` | Event |
| `Save Method` | `save_method` | Event |

#### Key Metrics to Track

**Engagement Metrics:**
- Average time per step
- Step completion rate
- Overall funnel completion rate
- Form abandonment rate by step

**Conversion Metrics:**
- Quote save rate (quote_save_success / configurator_loaded)
- Email capture rate (quote with email / total quotes)
- Shopify customer creation rate
- PDF download rate

**Product Metrics:**
- Most popular fabric types
- Most popular colors per fabric
- Average quote value by fabric type
- Average area and perimeter by corner count

**Error Metrics:**
- Validation errors by type
- Step validation failure rate
- Shopify integration failure rate
- PDF generation failure rate

### 10.2 GA4 Explorations

#### Funnel Analysis

**Purpose:** Visualize user progression through steps

**Setup:**
1. Go to GA4 → Explore → Funnel exploration
2. Create funnel:
   - Step 1: `configurator_loaded`
   - Step 2: `step_1_completed` (Fabric selection)
   - Step 3: `step_2_completed` (Edge type)
   - Step 4: `step_3_completed` (Fixing points)
   - Step 5: `step_4_completed` (Measurements)
   - Step 6: `step_5_completed` (Dimensions)
   - Step 7: `step_6_completed` (Heights)
   - Step 8: `quote_save_success`

**Segment by:**
- Device type (mobile vs desktop)
- First-time vs returning users

#### Path Analysis

**Purpose:** Understand navigation patterns

**Setup:**
1. Go to GA4 → Explore → Path exploration
2. Starting point: `configurator_loaded`
3. Node type: Event name
4. Path visualization: Tree

**Insights:**
- Where do users go back?
- Which steps are skipped?
- What's the typical path to completion?

#### Cohort Analysis

**Purpose:** Track user behavior over time

**Setup:**
1. Go to GA4 → Explore → Cohort exploration
2. Cohort definition: `configurator_session_start` date
3. Return event: `quote_save_success`
4. Cohort size: Daily or Weekly

**Insights:**
- Are users saving quotes on first visit?
- How long do users take to complete configuration?
- Do users return after abandoning?

### 10.3 Custom Reports

#### Quote Value Analysis Report

**Purpose:** Analyze quote values and product preferences

**Metrics:**
- Total quotes saved
- Average quote value
- Median quote value
- High-value quote count (>$3000)

**Dimensions:**
- Fabric type
- Corner count
- Currency
- Device type

**Filters:**
- Event name = `quote_save_success`

#### Error Frequency Report

**Purpose:** Identify common user mistakes

**Metrics:**
- Error count
- Unique users with errors
- Average errors per session

**Dimensions:**
- Error type
- Step number
- Device type

**Filters:**
- Event name contains "error" or "validation"

#### Shopify Integration Health Report

**Purpose:** Monitor integration reliability

**Metrics:**
- Shopify customer creation attempts
- Success rate
- Failure count

**Dimensions:**
- Error type
- Email domain
- Currency

**Filters:**
- Event name = `shopify_customer_created` or `shopify_customer_creation_failed`

### 10.4 Supabase Monitoring

#### Edge Function Logs

**Access Logs:**
```bash
# View recent logs
supabase functions logs add-shopify-customer --tail

# Filter for errors
supabase functions logs add-shopify-customer | grep -i error

# Follow logs in real-time
supabase functions logs add-shopify-customer --follow
```

**Log Monitoring in Dashboard:**
1. Go to Supabase Dashboard
2. Select your project
3. Click "Edge Functions" in sidebar
4. Click on function name
5. View logs in real-time

#### Database Query Performance

**Slow Query Monitoring:**
1. Go to Supabase Dashboard → Database → Query Performance
2. Review slow queries
3. Optimize with indexes

**Recommended Indexes:**
```sql
-- Already created in migrations
CREATE INDEX idx_saved_quotes_reference ON saved_quotes(reference);
CREATE INDEX idx_saved_quotes_email ON saved_quotes(email);
CREATE INDEX idx_saved_quotes_expires_at ON saved_quotes(expires_at);
CREATE INDEX idx_saved_quotes_shopify_customer ON saved_quotes(shopify_customer_id);
```

#### Database Size Monitoring

```sql
-- Check table size
SELECT
  pg_size_pretty(pg_total_relation_size('saved_quotes')) AS total_size,
  pg_size_pretty(pg_relation_size('saved_quotes')) AS table_size,
  pg_size_pretty(pg_indexes_size('saved_quotes')) AS indexes_size;

-- Count records
SELECT COUNT(*) FROM saved_quotes;

-- Count expired quotes
SELECT COUNT(*) FROM saved_quotes WHERE expires_at < NOW();
```

### 10.5 Alerts and Notifications

#### GA4 Custom Alerts

**Setup:**
1. Go to GA4 → Admin → Custom alerts
2. Create alerts for:

**High Error Rate Alert:**
- Metric: `error_occurred` event count
- Condition: Greater than 10 events per hour
- Notification: Email to dev team

**Low Quote Save Rate Alert:**
- Metric: `quote_save_success` / `configurator_loaded`
- Condition: Less than 5% conversion
- Notification: Email to product team

**Shopify Integration Failure Alert:**
- Metric: `shopify_customer_creation_failed` event count
- Condition: Greater than 5 events per hour
- Notification: Email to dev team + Slack

#### Supabase Alerts

**Database Connection Alerts:**
1. Go to Supabase Dashboard → Settings → Database
2. Configure alerts for:
   - Connection pool exhaustion
   - High CPU usage
   - Storage capacity threshold

**Edge Function Error Rate:**
Configure monitoring service (e.g., Sentry, Datadog) to alert on:
- Function timeout errors
- 500 response rate > 1%
- Function invocation failures

### 10.6 Performance Metrics

#### Key Performance Indicators (KPIs)

**User Experience:**
- Average configurator load time: < 2 seconds
- Average step transition time: < 500ms
- PDF generation time: < 5 seconds
- Quote save time: < 3 seconds

**Reliability:**
- GA4 event delivery rate: > 99%
- Shopify customer creation success rate: > 95%
- Edge Function uptime: > 99.9%
- Database query success rate: > 99.9%

**Business Metrics:**
- Quote save conversion rate: Target > 10%
- Email capture rate: Target > 60%
- Shopify customer creation rate: Target > 95%
- Quote-to-cart conversion rate: Target > 20%

#### Performance Monitoring Tools

**Frontend Performance:**
- Lighthouse CI for build-time performance audits
- Web Vitals monitoring in GA4
- Real User Monitoring (RUM) for actual user experience

**Backend Performance:**
- Supabase Dashboard for function execution time
- Database query performance analyzer
- Edge Function logs for latency tracking

---

## 11. Troubleshooting Guide

### 11.1 GA4 Events Not Appearing

#### Symptom
Events are not showing up in GA4 Realtime reports or DebugView.

#### Diagnostic Steps

**1. Check if gtag is loaded:**
```javascript
// In browser console
console.log(typeof window.gtag);
// Should output: "function"

console.log(window.dataLayer);
// Should output: array with GA4 initialization data
```

**2. Check for console errors:**
```javascript
// Filter console for analytics messages
console.log('📊'); // Look for GA Event logs
```

**3. Verify Measurement ID:**
- Check `index.html` for correct ID: `G-V8131RB72K`
- Ensure ID matches your GA4 property
- Check for typos in measurement ID

**4. Check Network Tab:**
- Open DevTools → Network tab
- Filter for "google-analytics.com"
- Look for POST requests to `/g/collect`
- If no requests, events aren't being sent

#### Common Causes and Solutions

| Cause | Solution |
|-------|----------|
| Ad blocker enabled | Disable ad blocker or test in incognito mode |
| Wrong Measurement ID | Update ID in `index.html` and `analytics.ts` |
| gtag script blocked by CSP | Add `script-src https://www.googletagmanager.com` to CSP |
| Events sent before gtag loaded | Add `window.addEventListener('load')` wrapper |
| GA4 property not set up | Create GA4 property in Google Analytics |

#### Quick Fix

```typescript
// Ensure gtag is loaded before tracking
export const trackEvent = (eventName: string, properties?: GAEventProperties): void => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', eventName, properties);
    console.log('📊 GA Event:', eventName, properties);
  } else {
    console.warn('⚠️ Google Analytics not initialized. Event:', eventName, properties);

    // Retry after 1 second
    setTimeout(() => {
      if (window.gtag) {
        window.gtag('event', eventName, properties);
      }
    }, 1000);
  }
};
```

### 11.2 Shopify Customer Not Created

#### Symptom
Quote saves successfully but customer doesn't appear in Shopify.

#### Diagnostic Steps

**1. Check Supabase Edge Function logs:**
```bash
supabase functions logs add-shopify-customer --tail
```

Look for:
- `Shopify API error: 401` - Authentication issue
- `Shopify API error: 403` - Permission issue
- `Shopify API error: 422` - Validation issue
- `Shopify search failed` - Network issue

**2. Verify Supabase Secrets:**
```bash
# Check if secrets are set (values are hidden)
supabase secrets list --project-ref your-project-ref
```

Should show:
- `SHOPIFY_SHOP_DOMAIN`
- `SHOPIFY_ADMIN_API_TOKEN`

**3. Test Edge Function directly:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/add-shopify-customer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "test@example.com",
    "tags": ["test"],
    "quoteReference": "TEST",
    "totalPrice": 100,
    "currency": "NZD"
  }'
```

**4. Check Shopify App permissions:**
- Go to Shopify Admin → Apps → Your custom app
- Verify `write_customers` scope is enabled
- Check app is installed

#### Common Causes and Solutions

| Cause | Solution |
|-------|----------|
| Invalid API token | Regenerate token in Shopify Admin |
| Missing API scopes | Add `write_customers` and `read_customers` scopes |
| Wrong shop domain | Verify domain is `xxx.myshopify.com` format |
| Shopify API rate limit | Wait and retry, implement exponential backoff |
| Invalid email format | Validate email before sending |
| Network timeout | Increase function timeout in Supabase |

#### Quick Fixes

**Fix 1: Regenerate Shopify Token**
1. Go to Shopify Admin → Apps → Your custom app
2. Click "Delete app" and confirm
3. Create new app with same name
4. Copy new Admin API Access Token
5. Update Supabase secret: `SHOPIFY_ADMIN_API_TOKEN`

**Fix 2: Verify Shop Domain**
```typescript
// In add-shopify-customer Edge Function
const SHOPIFY_SHOP_DOMAIN = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
console.log('Using shop domain:', SHOPIFY_SHOP_DOMAIN); // Check logs

// Ensure format is: store-name.myshopify.com
// NOT: https://store-name.myshopify.com (no protocol)
```

**Fix 3: Add Retry Logic**
```typescript
// Add to Edge Function
async function createCustomerWithRetry(payload: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(shopifyEndpoint, {
        method: 'POST',
        headers: shopifyHeaders,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2');
        console.log(`Rate limited, retrying after ${retryAfter}s`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }

      throw new Error(`Shopify API error: ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
```

### 11.3 Quote Not Loading from Link

#### Symptom
User clicks quote link but configuration doesn't load.

#### Diagnostic Steps

**1. Check URL format:**
```
Correct: https://yoursite.com/?quote=SS-A1B2C3
Wrong: https://yoursite.com/quote/SS-A1B2C3
```

**2. Check browser console:**
```javascript
// Look for errors like:
// "Quote not found"
// "Quote expired"
// "Failed to fetch quote"
```

**3. Verify quote exists in database:**
```sql
-- In Supabase SQL Editor
SELECT * FROM saved_quotes WHERE reference = 'SS-A1B2C3';
```

**4. Check expiration:**
```sql
SELECT
  reference,
  created_at,
  expires_at,
  expires_at > NOW() AS is_valid
FROM saved_quotes
WHERE reference = 'SS-A1B2C3';
```

#### Common Causes and Solutions

| Cause | Solution |
|-------|----------|
| Quote expired | Extend expiration or save new quote |
| Invalid reference code | Check for typos in URL |
| RLS policy blocking access | Verify RLS allows anonymous reads |
| Network error | Check Supabase connection |
| Reference not found | Quote may have been deleted |

#### Quick Fixes

**Fix 1: Extend Quote Expiration**
```sql
-- Extend all quotes by 30 days
UPDATE saved_quotes
SET expires_at = expires_at + INTERVAL '30 days'
WHERE reference = 'SS-A1B2C3';
```

**Fix 2: Update RLS Policy**
```sql
-- Ensure quotes can be read anonymously
DROP POLICY IF EXISTS "Anyone can read quotes by reference" ON saved_quotes;

CREATE POLICY "Anyone can read quotes by reference"
  ON saved_quotes FOR SELECT
  USING (true);
```

**Fix 3: Add Better Error Handling**
```typescript
// In quoteManager.ts
export async function loadQuote(reference: string): Promise<SavedQuote | null> {
  try {
    const { data, error } = await supabase
      .from('saved_quotes')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (error) {
      console.error('Database error loading quote:', error);
      analytics.quoteLoadFailed({
        quote_id: reference,
        error_message: error.message,
        error_type: 'database_error',
      });
      return null;
    }

    if (!data) {
      console.warn('Quote not found:', reference);
      analytics.quoteLoadFailed({
        quote_id: reference,
        error_message: 'Quote not found',
        error_type: 'not_found',
      });
      return null;
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      console.warn('Quote expired:', reference);
      analytics.quoteLoadFailed({
        quote_id: reference,
        error_message: 'Quote expired',
        error_type: 'expired',
      });
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error loading quote:', error);
    return null;
  }
}
```

### 11.4 CORS Errors

#### Symptom
Browser console shows CORS errors when calling Supabase Edge Functions.

**Example Error:**
```
Access to fetch at 'https://project.supabase.co/functions/v1/add-shopify-customer'
from origin 'https://yoursite.com' has been blocked by CORS policy
```

#### Diagnostic Steps

**1. Check OPTIONS request:**
- Open DevTools → Network tab
- Look for OPTIONS request before POST
- Check if it returns 200 status

**2. Verify CORS headers in response:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey
```

**3. Check Edge Function CORS configuration:**
```typescript
// In Edge Function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

#### Solutions

**Fix 1: Add OPTIONS Handler**
```typescript
// In all Edge Functions
Deno.serve(async (req: Request) => {
  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ... rest of function

  // Always include CORS headers in response
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});
```

**Fix 2: Update CORS Headers for Production**
```typescript
// Restrict to specific domains in production
const allowedOrigins = [
  'https://yoursite.com',
  'https://www.yoursite.com',
  'http://localhost:5173', // Development
];

const origin = req.headers.get('origin') || '';
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

**Fix 3: Redeploy Functions**
```bash
# After updating CORS headers
supabase functions deploy add-shopify-customer
supabase functions deploy save-quote
```

### 11.5 PDF Generation Failures

#### Symptom
PDF download fails or generates blank PDF.

#### Diagnostic Steps

**1. Check console errors:**
```javascript
// Look for:
// "html2canvas failed"
// "jsPDF error"
// "Canvas element not found"
```

**2. Verify canvas element exists:**
```javascript
// In browser console
document.querySelector('[data-canvas-id]');
// Should return canvas element
```

**3. Test with Supabase Edge Function:**
```bash
curl -X POST "https://project.supabase.co/functions/v1/generate-pdf" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "html": "<html><body>Test PDF</body></html>",
    "config": {...},
    "calculations": {...}
  }'
```

#### Common Causes and Solutions

| Cause | Solution |
|-------|----------|
| Canvas not rendered | Wait for canvas render before generating PDF |
| html2canvas blocked by CSP | Add appropriate CSP headers |
| Large canvas size | Reduce canvas dimensions or quality |
| Browser compatibility | Use Edge Function for reliability |
| Network timeout | Increase timeout for PDF generation |

#### Quick Fixes

**Fix 1: Wait for Canvas**
```typescript
// In pdfGenerator.ts
export async function generatePDF(canvasId: string) {
  // Wait for canvas to fully render
  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = document.querySelector(`[data-canvas-id="${canvasId}"]`);
  if (!canvas) {
    throw new Error('Canvas not found');
  }

  // Generate PDF
  const imgData = await html2canvas(canvas);
  // ...
}
```

**Fix 2: Use Edge Function**
```typescript
// Call server-side PDF generation instead
async function generatePDFViaSup abase(config, calculations) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/generate-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ config, calculations }),
    }
  );

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  // Download
  const a = document.createElement('a');
  a.href = url;
  a.download = `quote-${Date.now()}.pdf`;
  a.click();
}
```

### 11.6 High Database Connection Count

#### Symptom
Supabase shows high connection count or connection pool exhaustion.

#### Diagnostic Steps

```sql
-- Check active connections
SELECT
  count(*) as active_connections,
  max_connections
FROM pg_stat_database,
     (SELECT setting::int as max_connections FROM pg_settings WHERE name = 'max_connections')
WHERE datname = current_database()
GROUP BY max_connections;
```

#### Solutions

**Fix 1: Use Connection Pooling**
```typescript
// Use Supabase pooler URL instead of direct connection
const SUPABASE_URL = 'https://project.supabase.co'; // Pooler
// Not: 'postgresql://postgres:password@db.project.supabase.co:5432/postgres'
```

**Fix 2: Close Connections Properly**
```typescript
// In Edge Functions
const supabase = createClient(url, key);

try {
  const { data, error } = await supabase
    .from('saved_quotes')
    .insert(quote);

  return data;
} finally {
  // Connections are automatically pooled
  // No manual cleanup needed with Supabase client
}
```

**Fix 3: Increase Pool Size**
1. Go to Supabase Dashboard → Database → Connection pooler
2. Adjust pool size if needed
3. Monitor connection count after deployment

---

## Summary

This comprehensive guide covers all aspects of the GA4 tracking and Shopify customer integration in the ShadeSpace Shade Sail Configurator. Key takeaways:

**For Developers:**
- 70+ GA4 events track every user interaction
- Supabase Edge Functions handle Shopify customer creation
- Full TypeScript type safety throughout the integration
- Comprehensive error handling and retry logic
- Detailed API reference for all endpoints

**For Non-Technical Users:**
- Step-by-step Shopify Custom App setup
- Supabase secrets configuration via dashboard
- Verification checklist to confirm setup
- Common issues and solutions in plain language

**For Everyone:**
- Testing procedures for all integration points
- Migration guides for updating versions
- Monitoring and alerting best practices
- Troubleshooting guide for common issues

**Next Steps:**
1. Review the relevant sections for your role
2. Complete the verification checklist
3. Test the integration end-to-end
4. Set up monitoring and alerts
5. Document any customizations you make

For questions or issues not covered in this guide, contact your development team or refer to:
- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Shopify Admin API Documentation](https://shopify.dev/docs/api/admin-rest)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)

---

**Last Updated:** October 2025
**Version:** 1.0
**Maintained By:** ShadeSpace Development Team
