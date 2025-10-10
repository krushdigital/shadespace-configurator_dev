# Google Analytics 4 Event Tracking Implementation Guide
## ShadeSpace Shade Sail Configurator

**Document Version:** 1.0
**Date:** October 10, 2025
**Implementation Status:** Partially Complete (Step 1 implemented, remaining steps ready for implementation)

---

## Table of Contents
1. [Overview](#overview)
2. [Implementation Architecture](#implementation-architecture)
3. [Event Categories & Complete Event List](#event-categories--complete-event-list)
4. [Event Properties Reference](#event-properties-reference)
5. [Setup Instructions for GA4](#setup-instructions-for-ga4)
6. [Implementation Code Examples](#implementation-code-examples)
7. [Testing & Validation](#testing--validation)
8. [Conversion Funnels](#conversion-funnels)
9. [Dashboard & Reporting Recommendations](#dashboard--reporting-recommendations)

---

## Overview

### Purpose
This document provides a complete specification of all Google Analytics 4 events tracked in the ShadeSpace Shade Sail Configurator. It serves as the authoritative reference for:
- Analytics team setup and configuration
- Marketing team reporting and analysis
- Development team implementation and maintenance

### Key Metrics Tracked
- User engagement at each configurator step
- Drop-off rates and conversion funnel performance
- Feature usage (canvas interactions, tooltips, PDF downloads)
- Error rates and validation issues
- Time spent on each step
- Product configuration patterns
- Revenue attribution

---

## Implementation Architecture

### File Structure
```
shade_space/src/
├── utils/
│   └── analytics.ts          # Core tracking utility (IMPLEMENTED)
└── components/
    ├── ShadeConfigurator.tsx  # Main component with navigation tracking
    └── steps/
        ├── FabricSelectionContent.tsx        # Step 1 (IMPLEMENTED)
        ├── EdgeTypeContent.tsx               # Step 2
        ├── CornersContent.tsx                # Step 3
        ├── CombinedMeasurementContent.tsx    # Step 4
        ├── DimensionsContent.tsx             # Step 5
        ├── FixingPointsContent.tsx           # Step 6
        └── ReviewContent.tsx                 # Step 7
```

### Analytics Utility
The `analytics.ts` file provides a centralized tracking interface with type-safe event methods. All events are logged to console for debugging and sent to Google Analytics when `window.gtag` is available.

**Key Features:**
- TypeScript support with type-safe event properties
- Fallback logging when GA is not initialized
- Centralized event naming and property management
- Console logging for debugging (remove in production if desired)

---

## Event Categories & Complete Event List

### 1. Session & Page Events

#### **configurator_loaded**
Fires when the configurator component first mounts.
```typescript
Properties: {
  timestamp: string (ISO 8601)
  user_agent: string (optional)
  referrer_url: string (optional)
}
```

#### **configurator_session_start**
Fires when user begins interacting with the configurator.
```typescript
Properties: {
  session_id: string
  entry_point: string (URL)
}
```

---

### 2. Step 1: Fabric & Color Selection

#### **step_1_viewed**
Fires when Step 1 is displayed to the user.
```typescript
Properties: {
  step_number: 1
  step_name: "fabric_and_color"
}
```

#### **fabric_type_selected**
User selects a fabric material (Monotec, Extrablock, Shadetec).
```typescript
Properties: {
  fabric_type: "monotec370" | "extrablock330" | "shadetec320"
  fabric_label: string
}
Example: { fabric_type: "monotec370", fabric_label: "Monotec 370" }
```

#### **fabric_color_selected**
User selects a fabric color.
```typescript
Properties: {
  fabric_type: string
  fabric_color: string
  shade_factor: number (optional)
}
Example: { fabric_type: "monotec370", fabric_color: "Koonunga Green", shade_factor: 95 }
```

#### **fabric_details_viewed**
User opens tooltip to view fabric details.
```typescript
Properties: {
  fabric_type: string
  action: "view_details"
}
```

#### **fabric_link_clicked**
User clicks external link to fabric information page.
```typescript
Properties: {
  fabric_type: string
  link_url: "https://shadespace.com/pages/our-fabrics"
}
```

#### **step_1_completed**
User successfully completes Step 1 and clicks Continue.
```typescript
Properties: {
  step_number: 1
  step_name: "fabric_and_color"
  time_spent_seconds: number
  fabric_type: string
  fabric_color: string
}
Example: { step_number: 1, step_name: "fabric_and_color", time_spent_seconds: 45, fabric_type: "monotec370", fabric_color: "Koonunga Green" }
```

#### **step_1_validation_error**
Validation error occurs on Step 1.
```typescript
Properties: {
  step_number: 1
  error_type: "missing_fabric" | "missing_color"
  error_message: string
}
```

---

### 3. Step 2: Edge Reinforcement Type (Style)

#### **step_2_viewed**
```typescript
Properties: {
  step_number: 2
  step_name: "edge_type"
}
```

#### **edge_type_selected**
User selects edge reinforcement type.
```typescript
Properties: {
  edge_type: "cabled" | "webbing"
}
```

#### **edge_type_details_viewed**
User views edge type tooltip.
```typescript
Properties: {
  edge_type: string
  action: "view_tooltip"
}
```

#### **step_2_completed**
```typescript
Properties: {
  step_number: 2
  step_name: "edge_type"
  time_spent_seconds: number
  edge_type: string
}
```

#### **step_2_validation_error**
```typescript
Properties: {
  step_number: 2
  error_type: string
  error_message: string
}
```

---

### 4. Step 3: Number of Fixing Points (Corners)

#### **step_3_viewed**
```typescript
Properties: {
  step_number: 3
  step_name: "fixing_points"
}
```

#### **fixing_points_selected**
User selects number of corners/fixing points.
```typescript
Properties: {
  corners: 3 | 4 | 5 | 6
  shape_description: string
}
Example: { corners: 4, shape_description: "Most popular choice" }
```

#### **step_3_completed**
```typescript
Properties: {
  step_number: 3
  step_name: "fixing_points"
  time_spent_seconds: number
  corners: number
}
```

#### **step_3_validation_error**
```typescript
Properties: {
  step_number: 3
  error_type: string
  error_message: string
}
```

---

### 5. Step 4: Measurement Options

#### **step_4_viewed**
```typescript
Properties: {
  step_number: 4
  step_name: "measurement_options"
}
```

#### **unit_selected**
User selects measurement unit system.
```typescript
Properties: {
  unit: "metric" | "imperial"
}
```

#### **measurement_option_selected**
User selects measurement handling option.
```typescript
Properties: {
  measurement_option: "adjust" | "exact"
  option_label: string
}
Example: { measurement_option: "adjust", option_label: "Adjust Size of Sail to Fit the Space" }
```

#### **measurement_option_tooltip_viewed**
User views detailed tooltip for measurement options.
```typescript
Properties: {
  measurement_option: "adjust" | "exact"
  tooltip_type: "option_a" | "option_b"
}
```

#### **hardware_info_viewed**
User views hardware included tooltip.
```typescript
Properties: {
  corners: number
  action: "view_hardware_info"
}
```

#### **hardware_link_clicked**
User clicks external hardware information link.
```typescript
Properties: {
  link_url: "https://shadespace.com/pages/hardware"
  corners: number
}
```

#### **step_4_completed**
```typescript
Properties: {
  step_number: 4
  step_name: "measurement_options"
  time_spent_seconds: number
  unit: string
  measurement_option: string
}
```

#### **step_4_validation_error**
```typescript
Properties: {
  step_number: 4
  error_type: "missing_unit" | "missing_option"
  error_message: string
}
```

---

### 6. Step 5: Dimensions (Edge Measurements)

#### **step_5_viewed**
```typescript
Properties: {
  step_number: 5
  step_name: "dimensions"
  corners: number
  unit: string
}
```

#### **edge_measurement_entered**
User enters an edge measurement (e.g., AB, BC, CD).
```typescript
Properties: {
  edge_key: string (e.g., "AB", "BC")
  measurement_value: number
  unit: "metric" | "imperial"
  corners: number
}
Example: { edge_key: "AB", measurement_value: 3000, unit: "metric", corners: 4 }
```

#### **diagonal_measurement_entered**
User enters a diagonal measurement (e.g., AC, BD).
```typescript
Properties: {
  diagonal_key: string (e.g., "AC", "BD")
  measurement_value: number
  unit: string
  corners: number
}
```

#### **measurement_field_focused**
User focuses on a measurement input field.
```typescript
Properties: {
  measurement_key: string
  measurement_type: "edge" | "diagonal"
}
```

#### **measurement_field_highlighted**
Measurement field is highlighted on canvas hover.
```typescript
Properties: {
  measurement_key: string
}
```

#### **canvas_point_dragged**
User drags a point on the interactive canvas.
```typescript
Properties: {
  point_label: string (e.g., "A", "B", "C")
  new_x: number
  new_y: number
}
```

#### **typo_suggestion_shown**
System detects potential typo in measurement.
```typescript
Properties: {
  measurement_key: string
  current_value: number
  suggested_value: number
  reason: string
}
Example: { measurement_key: "AB", current_value: 30000, suggested_value: 3000, reason: "Value seems 10x too large" }
```

#### **typo_suggestion_accepted**
User accepts typo correction.
```typescript
Properties: {
  measurement_key: string
  old_value: number
  new_value: number
}
```

#### **typo_suggestion_dismissed**
User dismisses typo suggestion.
```typescript
Properties: {
  measurement_key: string
  dismissed_value: number
}
```

#### **perimeter_limit_exceeded**
User enters measurements exceeding 50m limit.
```typescript
Properties: {
  calculated_perimeter: number
  unit: string
  max_perimeter: number
}
```

#### **diagonal_validation_error**
Diagonal measurements don't create valid shape.
```typescript
Properties: {
  corners: number
  error_details: string
}
```

#### **step_5_completed**
```typescript
Properties: {
  step_number: 5
  step_name: "dimensions"
  time_spent_seconds: number
  corners: number
  edges_entered: number
  diagonals_entered: number
  total_area: number
  perimeter: number
}
```

#### **step_5_validation_error**
```typescript
Properties: {
  step_number: 5
  error_type: string
  error_message: string
  measurements_missing: number
}
```

---

### 7. Step 6: Heights & Anchor Points

#### **step_6_viewed**
```typescript
Properties: {
  step_number: 6
  step_name: "anchor_points"
  corners: number
}
```

#### **anchor_height_entered**
User enters anchor point height.
```typescript
Properties: {
  anchor_point: string (e.g., "A", "B")
  height_value: number
  unit: string
}
```

#### **fixing_type_selected**
User selects attachment type for anchor point.
```typescript
Properties: {
  anchor_point: string
  fixing_type: "post" | "building"
}
```

#### **eye_orientation_selected**
User selects eye orientation for anchor point.
```typescript
Properties: {
  anchor_point: string
  orientation: "horizontal" | "vertical"
}
```

#### **anchor_height_typo_suggestion_shown**
```typescript
Properties: {
  anchor_point: string
  current_value: number
  suggested_value: number
}
```

#### **anchor_height_typo_accepted**
```typescript
Properties: {
  anchor_point: string
  old_value: number
  new_value: number
}
```

#### **anchor_height_typo_dismissed**
```typescript
Properties: {
  anchor_point: string
  dismissed_value: number
}
```

#### **step_6_completed**
```typescript
Properties: {
  step_number: 6
  step_name: "anchor_points"
  time_spent_seconds: number
  corners: number
  all_heights_entered: boolean
  all_types_selected: boolean
  all_orientations_selected: boolean
}
```

#### **step_6_validation_error**
```typescript
Properties: {
  step_number: 6
  error_type: string
  error_message: string
}
```

---

### 8. Step 7: Review & Purchase

#### **step_7_viewed**
```typescript
Properties: {
  step_number: 7
  step_name: "review_purchase"
  total_price: number
  currency: string
}
```

#### **price_summary_viewed**
Pricing summary displayed to user.
```typescript
Properties: {
  fabric_type: string
  edge_type: string
  corners: number
  area: number
  perimeter: number
  total_price: number
  currency: string
  wire_thickness: number (optional)
  webbing_width: number (optional)
}
```

#### **currency_changed**
User changes currency selection.
```typescript
Properties: {
  old_currency: string
  new_currency: string
  price_change: number
}
```

#### **acknowledgment_checked**
User checks an acknowledgment checkbox.
```typescript
Properties: {
  acknowledgment_type: "custom_manufactured" | "measurements_accurate" | "installation_not_included" | "structural_responsibility"
}
```

#### **acknowledgment_unchecked**
User unchecks an acknowledgment checkbox.
```typescript
Properties: {
  acknowledgment_type: string
}
```

#### **all_acknowledgments_completed**
User completes all required acknowledgments.
```typescript
Properties: {
  time_to_complete_seconds: number
}
```

#### **pdf_quote_clicked**
User clicks Download PDF Quote button.
```typescript
Properties: {
  total_price: number
  currency: string
  has_email: boolean
}
```

#### **pdf_generated_success**
PDF successfully generated.
```typescript
Properties: {
  file_size_kb: number
  generation_time_ms: number
  includes_canvas_image: boolean
}
```

#### **pdf_generation_failed**
PDF generation fails.
```typescript
Properties: {
  error_message: string
  error_type: string
}
```

#### **email_summary_button_clicked**
User clicks Email Summary button.
```typescript
Properties: {
  action: "show_email_input"
}
```

#### **email_address_entered**
User enters email address.
```typescript
Properties: {
  email_domain: string (e.g., "gmail.com")
  has_value: boolean
}
```

#### **email_summary_sent**
Email successfully sent.
```typescript
Properties: {
  email_domain: string
  includes_pdf: boolean
  includes_canvas_image: boolean
  total_price: number
  currency: string
}
```

#### **email_send_failed**
Email send fails.
```typescript
Properties: {
  error_message: string
  error_type: string
}
```

#### **email_input_cancelled**
User cancels email input.
```typescript
Properties: {
  had_email_entered: boolean
}
```

#### **add_to_cart_clicked**
User clicks Add to Cart button.
```typescript
Properties: {
  total_price: number
  currency: string
  fabric_type: string
  edge_type: string
  corners: number
  area: number
  measurement_option: string
  all_acknowledgments_checked: boolean
}
```

#### **add_to_cart_blocked**
Add to Cart blocked due to incomplete requirements.
```typescript
Properties: {
  reason: "missing_diagonals" | "missing_acknowledgments"
  diagonals_entered: boolean
  acknowledgments_checked: boolean
}
```

#### **product_creation_started**
Product creation process begins.
```typescript
Properties: {
  loading_step: "creating_product"
  progress: 30
}
```

#### **product_created_success**
Product successfully created in Shopify.
```typescript
Properties: {
  product_id: string
  variant_id: string
  creation_time_ms: number
}
```

#### **product_creation_failed**
Product creation fails.
```typescript
Properties: {
  error_message: string
  error_type: string
}
```

#### **cart_add_started**
Adding product to cart begins.
```typescript
Properties: {
  loading_step: "adding_to_cart"
  progress: 85
}
```

#### **cart_add_success**
Product successfully added to cart.
```typescript
Properties: {
  product_id: string
  variant_id: string
  quantity: number
  total_time_ms: number
}
```

#### **cart_add_failed**
Adding to cart fails.
```typescript
Properties: {
  error_message: string
  error_type: string
}
```

#### **redirect_to_cart**
User redirected to cart page.
```typescript
Properties: {
  progress: 100
  total_configurator_time_seconds: number
}
```

---

### 9. Navigation & Flow Events

#### **step_opened**
User opens/expands a step accordion.
```typescript
Properties: {
  step_number: number
  step_name: string
  from_step: number
}
```

#### **step_closed**
User closes/collapses a step accordion.
```typescript
Properties: {
  step_number: number
  step_name: string
}
```

#### **next_button_clicked**
User clicks Next/Continue button.
```typescript
Properties: {
  current_step: number
  next_step: number
  is_valid: boolean
}
```

#### **back_button_clicked**
User clicks Back button.
```typescript
Properties: {
  current_step: number
  previous_step: number
}
```

#### **step_navigation_error**
User tries to navigate but validation blocks.
```typescript
Properties: {
  attempted_step: number
  current_step: number
  validation_errors_count: number
}
```

#### **step_auto_scrolled**
Page auto-scrolls to step.
```typescript
Properties: {
  target_step: number
  scroll_offset: number
}
```

---

### 10. Canvas & Visualization Events

#### **canvas_rendered**
Canvas visualization is rendered.
```typescript
Properties: {
  corners: number
  canvas_type: "interactive" | "readonly"
  width: number
  height: number
}
```

#### **canvas_point_hover**
User hovers over a canvas point.
```typescript
Properties: {
  point_label: string
  x: number
  y: number
}
```

#### **canvas_edge_hover**
User hovers over a canvas edge.
```typescript
Properties: {
  edge_key: string
  measurement_value: number (optional)
}
```

#### **canvas_snap_to_grid**
Point snaps to grid during drag.
```typescript
Properties: {
  point_label: string
  snapped_x: number
  snapped_y: number
}
```

#### **canvas_svg_exported**
Canvas SVG is exported for PDF/email.
```typescript
Properties: {
  purpose: "pdf" | "email"
  width: number
  height: number
}
```

---

### 11. Error & Support Events

#### **validation_error_displayed**
Validation error message shown to user.
```typescript
Properties: {
  step_number: number
  error_type: string
  error_count: number
}
```

#### **error_field_scrolled**
Page scrolls to error field.
```typescript
Properties: {
  field_key: string
  error_type: string
  is_typo_suggestion: boolean
}
```

#### **form_abandoned**
User leaves configurator before completing.
```typescript
Properties: {
  last_completed_step: number
  total_time_seconds: number
  furthest_step_reached: number
}
```

#### **configurator_timeout**
Session times out.
```typescript
Properties: {
  last_active_step: number
  session_duration_seconds: number
}
```

---

### 12. Pricing & Calculation Events

#### **price_calculated**
Price is calculated/recalculated.
```typescript
Properties: {
  fabric_type: string
  edge_type: string
  corners: number
  area: number
  perimeter: number
  base_price: number
  extras_price: number
  total_price: number
  currency: string
  calculation_time_ms: number
}
```

#### **area_calculated**
Sail area is calculated.
```typescript
Properties: {
  area_sqm: number
  area_formatted: string
  corners: number
  unit: string
}
```

#### **perimeter_calculated**
Sail perimeter is calculated.
```typescript
Properties: {
  perimeter_m: number
  perimeter_formatted: string
  corners: number
  unit: string
}
```

#### **wire_thickness_calculated**
Wire thickness is determined.
```typescript
Properties: {
  wire_thickness_mm: number
  perimeter: number
  corners: number
}
```

---

### 13. Mobile-Specific Events

#### **mobile_view_detected**
Configurator loaded on mobile device.
```typescript
Properties: {
  screen_width: number
  screen_height: number
  device_type: string
}
```

#### **mobile_step_navigation**
User navigates steps on mobile.
```typescript
Properties: {
  current_step: number
  interaction_type: string
  viewport_size: string
}
```

---

## Event Properties Reference

### Common Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| step_number | integer | Current step (1-7) | 1, 2, 3, 4, 5, 6, 7 |
| step_name | string | Step identifier | "fabric_and_color", "edge_type", "dimensions" |
| time_spent_seconds | number | Time user spent on step | 45, 120, 30 |
| timestamp | string | ISO 8601 timestamp | "2025-10-10T17:30:00Z" |

### Product Configuration Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| fabric_type | string | Fabric material ID | "monotec370", "extrablock330", "shadetec320" |
| fabric_color | string | Selected color | "Koonunga Green", "Charcoal", "Sand" |
| shade_factor | number | Shade percentage | 70, 85, 95 |
| edge_type | string | Edge reinforcement | "cabled", "webbing" |
| corners | integer | Number of fixing points | 3, 4, 5, 6 |
| unit | string | Measurement unit | "metric", "imperial" |
| measurement_option | string | Measurement handling | "adjust", "exact" |

### Measurement Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| measurement_key | string | Measurement identifier | "AB", "BC", "AC", "height_A" |
| measurement_value | number | Entered measurement | 3000 (mm), 120 (inches) |
| measurement_type | string | Type of measurement | "edge", "diagonal", "height" |
| edge_key | string | Edge identifier | "AB", "BC", "CD" |
| diagonal_key | string | Diagonal identifier | "AC", "BD", "CE" |
| anchor_point | string | Anchor point label | "A", "B", "C" |
| height_value | number | Height measurement | 2500, 98 |
| fixing_type | string | Attachment type | "post", "building" |
| orientation | string | Eye orientation | "horizontal", "vertical" |

### Pricing Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| total_price | number | Total calculated price | 1250.50, 2100.00 |
| currency | string | Selected currency | "NZD", "USD", "AUD", "GBP", "EUR" |
| base_price | number | Base fabric price | 1000.00 |
| extras_price | number | Additional features price | 250.50 |
| area | number | Sail area (sqm) | 12.5, 18.3 |
| perimeter | number | Sail perimeter (m) | 14.8, 20.2 |
| wire_thickness | number | Wire thickness (mm) | 4, 5, 6 |
| webbing_width | number | Webbing width (mm) | 48 |

### Error & Validation Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| error_type | string | Type of error | "missing_fabric", "invalid_measurement", "perimeter_too_large" |
| error_message | string | Error description | "Please select a fabric type", "Measurement required" |
| error_count | number | Number of errors | 1, 3, 5 |
| validation_errors_count | number | Count of validation errors | 2 |
| reason | string | Typo suggestion reason | "Value seems 10x too large", "Exceeds maximum" |

### Canvas & Interaction Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| point_label | string | Canvas point identifier | "A", "B", "C", "D", "E", "F" |
| new_x | number | New X coordinate | 150, 300, 450 |
| new_y | number | New Y coordinate | 200, 350, 500 |
| snapped_x | number | Snapped X coordinate | 150, 300, 450 |
| snapped_y | number | Snapped Y coordinate | 200, 350, 500 |
| canvas_type | string | Type of canvas | "interactive", "readonly" |
| width | number | Canvas width | 600 |
| height | number | Canvas height | 600 |

### Email & PDF Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| email_domain | string | Email domain | "gmail.com", "outlook.com", "company.com" |
| has_email | boolean | Email entered | true, false |
| includes_pdf | boolean | PDF included | true, false |
| includes_canvas_image | boolean | Canvas image included | true, false |
| file_size_kb | number | File size in KB | 245, 512 |
| generation_time_ms | number | Generation time (ms) | 1500, 3200 |
| purpose | string | Export purpose | "pdf", "email" |

### Cart & Purchase Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| product_id | string | Shopify product ID | "gid://shopify/Product/123456" |
| variant_id | string | Shopify variant ID | "987654" |
| quantity | number | Product quantity | 1 |
| creation_time_ms | number | Creation time (ms) | 2500 |
| total_time_ms | number | Total process time (ms) | 5000 |
| loading_step | string | Loading step name | "creating_product", "adding_to_cart" |
| progress | number | Progress percentage | 30, 60, 85, 100 |

### Acknowledgment Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| acknowledgment_type | string | Type of acknowledgment | "custom_manufactured", "measurements_accurate", "installation_not_included", "structural_responsibility" |
| all_acknowledgments_checked | boolean | All checked | true, false |
| time_to_complete_seconds | number | Time to complete | 120 |

### Mobile Properties

| Property | Type | Description | Example Values |
|----------|------|-------------|----------------|
| screen_width | number | Screen width (px) | 375, 414, 768 |
| screen_height | number | Screen height (px) | 667, 896, 1024 |
| device_type | string | Device type | "mobile", "tablet" |
| viewport_size | string | Viewport dimensions | "375x667", "768x1024" |
| interaction_type | string | Type of interaction | "tap", "swipe", "scroll" |

---

## Setup Instructions for GA4

### 1. Install Google Analytics 4

Add the GA4 tracking script to your application's main HTML file:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

Replace `GA_MEASUREMENT_ID` with your actual GA4 Measurement ID (format: G-XXXXXXXXXX).

### 2. Configure Custom Events

In GA4 Admin → Events, mark the following events as conversions:
- `cart_add_success`
- `product_created_success`
- `step_7_completed`
- `email_summary_sent`
- `pdf_generated_success`

### 3. Create Custom Dimensions

Navigate to GA4 Admin → Custom Definitions → Custom Dimensions and create the following:

**User-scoped dimensions:**
- session_id
- device_type

**Event-scoped dimensions:**
- step_number
- step_name
- fabric_type
- fabric_color
- edge_type
- corners
- unit
- measurement_option
- total_price
- currency
- error_type
- measurement_key
- anchor_point
- email_domain

### 4. Create Custom Metrics

Navigate to GA4 Admin → Custom Definitions → Custom Metrics:

**Event-scoped metrics:**
- time_spent_seconds
- measurement_value
- area
- perimeter
- file_size_kb
- generation_time_ms
- error_count
- total_time_ms
- progress

### 5. Enhanced Measurement

Enable Enhanced Measurement in GA4 Admin → Data Streams → Web → Enhanced Measurement:
- ☑ Page views
- ☑ Scrolls
- ☑ Outbound clicks
- ☑ Site search
- ☑ Form interactions
- ☑ File downloads

---

## Implementation Code Examples

### Example 1: Tracking a Step View

```typescript
// In any step component (e.g., FabricSelectionContent.tsx)
import { useEffect } from 'react';
import { analytics } from '../../utils/analytics';

export function FabricSelectionContent() {
  useEffect(() => {
    analytics.stepViewed(1, 'fabric_and_color');
  }, []);

  // Rest of component...
}
```

### Example 2: Tracking a User Selection

```typescript
// When user selects fabric type
<Card
  onClick={() => {
    analytics.fabricTypeSelected(fabric.id, fabric.label);
    updateConfig({ fabricType: fabric.id });
  }}
>
  {/* Card content */}
</Card>
```

### Example 3: Tracking Step Completion with Time

```typescript
// Track time spent on step
const stepStartTime = useRef(Date.now());

const handleNext = () => {
  const timeSpent = (Date.now() - stepStartTime.current) / 1000;
  analytics.stepCompleted(1, 'fabric_and_color', timeSpent, {
    fabric_type: config.fabricType,
    fabric_color: config.fabricColor,
  });
  onNext();
};
```

### Example 4: Tracking Tooltip Opens

```typescript
<Tooltip
  onOpen={() => analytics.fabricDetailsViewed(fabric.id)}
  content={/* tooltip content */}
>
  <span>?</span>
</Tooltip>
```

### Example 5: Tracking Errors

```typescript
// When validation error occurs
if (errors.length > 0) {
  analytics.validationErrorDisplayed(
    stepNumber,
    errors[0].type,
    errors.length
  );
}
```

### Example 6: Tracking Add to Cart Flow

```typescript
// Product creation started
analytics.productCreationStarted('creating_product', 30);

// Product created successfully
const startTime = Date.now();
// ... create product ...
const creationTime = Date.now() - startTime;
analytics.productCreatedSuccess(productId, variantId, creationTime);

// Cart add started
analytics.cartAddStarted('adding_to_cart', 85);

// Cart add success
const totalTime = Date.now() - startTime;
analytics.cartAddSuccess(productId, variantId, 1, totalTime);

// Redirect
analytics.redirectToCart(100, totalConfiguratorTime);
```

---

## Testing & Validation

### Development Testing

The analytics utility logs all events to the console. Check browser console for:
```
📊 GA Event: fabric_type_selected { fabric_type: "monotec370", fabric_label: "Monotec 370" }
```

### GA4 DebugView

1. Install Google Analytics Debugger Chrome Extension
2. Enable debug mode
3. Navigate to GA4 → Admin → DebugView
4. Test each step of the configurator
5. Verify events appear in real-time

### Event Validation Checklist

- [ ] All step view events fire on step load
- [ ] Selection events fire with correct properties
- [ ] Time tracking accurately captures step duration
- [ ] Error events fire when validation fails
- [ ] Canvas interaction events fire on user actions
- [ ] PDF/Email events fire correctly
- [ ] Add to cart flow tracks all stages
- [ ] Properties include all required data
- [ ] Currency and pricing data is accurate
- [ ] Mobile-specific events fire on mobile devices

### Testing Script

```javascript
// Run in browser console to verify tracking
const testEvents = [
  'configurator_loaded',
  'step_1_viewed',
  'fabric_type_selected',
  'fabric_color_selected',
  'step_1_completed',
];

// Check if events are being logged
console.log('Testing GA4 events...');
testEvents.forEach(event => {
  if (typeof analytics[event] === 'undefined') {
    console.error(`❌ Event not found: ${event}`);
  } else {
    console.log(`✅ Event exists: ${event}`);
  }
});
```

---

## Conversion Funnels

### Primary Conversion Funnel

Create this funnel in GA4 → Explore → Funnel Exploration:

1. **Step 1: Start** - `configurator_loaded`
2. **Step 2: Fabric Selected** - `step_1_completed`
3. **Step 3: Style Selected** - `step_2_completed`
4. **Step 4: Shape Selected** - `step_3_completed`
5. **Step 5: Units Selected** - `step_4_completed`
6. **Step 6: Dimensions Entered** - `step_5_completed`
7. **Step 7: Anchors Configured** - `step_6_completed`
8. **Step 8: Review Reached** - `step_7_viewed`
9. **Step 9: Cart Add Clicked** - `add_to_cart_clicked`
10. **Step 10: Conversion** - `cart_add_success`

**Key Metrics:**
- Overall conversion rate
- Drop-off rate at each step
- Average time per step
- Most common exit points

### Secondary Funnels

#### **Email Capture Funnel**
1. `step_7_viewed`
2. `email_summary_button_clicked`
3. `email_address_entered`
4. `email_summary_sent`

#### **PDF Download Funnel**
1. `step_7_viewed`
2. `pdf_quote_clicked`
3. `pdf_generated_success`

#### **Mobile vs Desktop Funnel**
Segment primary funnel by:
- Device category
- Screen resolution
- `mobile_view_detected` event

---

## Dashboard & Reporting Recommendations

### Dashboard 1: Configurator Performance Overview

**Metrics:**
- Total configurator starts
- Completion rate (cart_add_success / configurator_loaded)
- Average time to complete
- Average order value
- Revenue attributed to configurator

**Visualizations:**
- Funnel visualization (7 steps)
- Conversion rate by step (line chart)
- Top fabric types (bar chart)
- Top edge types (pie chart)
- Popular corner counts (bar chart)

### Dashboard 2: Step-by-Step Analysis

**For each step:**
- Views
- Completions
- Drop-off rate
- Average time spent
- Validation errors
- Most common error types

**Visualizations:**
- Step completion rates (bar chart)
- Time spent per step (box plot)
- Error frequency by type (table)
- Step navigation flow (Sankey diagram)

### Dashboard 3: Feature Usage & Engagement

**Metrics:**
- Tooltip views by type
- Canvas interactions
- PDF downloads
- Email summary sends
- External link clicks
- Typo suggestions shown/accepted/dismissed

**Visualizations:**
- Feature usage heatmap
- Tooltip engagement rate
- Canvas interaction frequency
- PDF vs Email preference

### Dashboard 4: Error & Friction Analysis

**Metrics:**
- Total validation errors
- Error rate by step
- Most common error types
- Typo suggestion acceptance rate
- Fields causing most errors

**Visualizations:**
- Error frequency timeline
- Error type distribution
- Problematic fields ranking
- Validation error impact on conversion

### Dashboard 5: Product Configuration Analysis

**Metrics:**
- Popular fabric types
- Popular colors by fabric
- Edge type preference
- Corner distribution
- Unit preference (metric vs imperial)
- Measurement option preference (adjust vs exact)
- Average sail size
- Average price by configuration

**Visualizations:**
- Configuration combinations (treemap)
- Price distribution (histogram)
- Size distribution (scatter plot)
- Fabric+Edge combinations (matrix)

### Dashboard 6: Revenue & Conversion Attribution

**Metrics:**
- Revenue by configuration
- Revenue by fabric type
- Revenue by corner count
- Average order value trends
- Conversion rate by traffic source
- Time to purchase

**Visualizations:**
- Revenue trend over time
- AOV by configuration
- Conversion rate by source
- Purchase timing distribution

### Dashboard 7: Mobile Experience

**Metrics:**
- Mobile vs desktop starts
- Mobile vs desktop conversion
- Mobile-specific errors
- Mobile step completion time
- Screen size distribution

**Visualizations:**
- Device comparison table
- Mobile funnel vs desktop funnel
- Mobile error patterns
- Screen size impact on conversion

---

## Recommended Alerts

Set up the following alerts in GA4 → Admin → Custom Alerts:

1. **Drop in Conversion Rate**
   - Alert when: `cart_add_success / configurator_loaded` drops > 20%
   - Frequency: Daily

2. **High Error Rate**
   - Alert when: Error events exceed 100/day
   - Frequency: Hourly

3. **PDF Generation Failures**
   - Alert when: `pdf_generation_failed` > 10/day
   - Frequency: Hourly

4. **Email Send Failures**
   - Alert when: `email_send_failed` > 5/day
   - Frequency: Hourly

5. **Cart Add Failures**
   - Alert when: `cart_add_failed` > 5/day
   - Frequency: Hourly

6. **Unusual Price Patterns**
   - Alert when: Average `total_price` changes > 30%
   - Frequency: Daily

---

## Custom Reports for Stakeholders

### Report 1: Weekly Executive Summary
- Total starts, completions, revenue
- Conversion rate trend
- Top 5 configurations
- Key friction points

### Report 2: Product Team Report
- Feature usage statistics
- Error patterns and fixes needed
- Canvas interaction insights
- Mobile experience metrics

### Report 3: Marketing Team Report
- Traffic source performance
- Campaign attribution
- Email capture rate
- PDF download engagement

### Report 4: Customer Success Report
- Common error types
- Average completion time
- Support intervention points
- Customer journey insights

---

## Implementation Checklist

### Phase 1: Core Events (Week 1)
- [x] Create analytics.ts utility file
- [x] Implement Step 1 tracking (Fabric & Color)
- [ ] Implement Step 2 tracking (Edge Type)
- [ ] Implement Step 3 tracking (Corners)
- [ ] Implement Step 4 tracking (Measurement Options)
- [ ] Test Phase 1 events in DebugView

### Phase 2: Complex Events (Week 2)
- [ ] Implement Step 5 tracking (Dimensions)
- [ ] Implement Step 6 tracking (Anchor Points)
- [ ] Add canvas interaction tracking
- [ ] Add typo suggestion tracking
- [ ] Test Phase 2 events in DebugView

### Phase 3: Purchase Flow (Week 3)
- [ ] Implement Step 7 tracking (Review)
- [ ] Add PDF generation tracking
- [ ] Add email summary tracking
- [ ] Add cart flow tracking
- [ ] Test complete purchase flow

### Phase 4: Navigation & Errors (Week 4)
- [ ] Add navigation tracking
- [ ] Add error tracking
- [ ] Add mobile-specific tracking
- [ ] Add pricing calculation tracking
- [ ] Final end-to-end testing

### Phase 5: GA4 Setup (Week 5)
- [ ] Configure GA4 property
- [ ] Create custom dimensions
- [ ] Create custom metrics
- [ ] Mark conversion events
- [ ] Set up custom alerts

### Phase 6: Dashboards & Reports (Week 6)
- [ ] Create Dashboard 1: Performance Overview
- [ ] Create Dashboard 2: Step Analysis
- [ ] Create Dashboard 3: Feature Usage
- [ ] Create Dashboard 4: Error Analysis
- [ ] Create Dashboard 5: Product Config
- [ ] Create Dashboard 6: Revenue Attribution
- [ ] Create Dashboard 7: Mobile Experience

### Phase 7: Documentation & Training
- [ ] Document GA4 setup process
- [ ] Create stakeholder report templates
- [ ] Train team on dashboard usage
- [ ] Document troubleshooting procedures
- [ ] Establish review cadence

---

## Appendix A: Event Name Conventions

All event names follow these conventions:
- **Lowercase with underscores**: `fabric_type_selected`
- **Verb-noun structure**: `[action]_[object]`
- **Step events prefix**: `step_[number]_[action]`
- **Consistent terminology**: Always use same terms (e.g., "fabric" not "material")

---

## Appendix B: Property Naming Conventions

All property names follow these conventions:
- **Lowercase with underscores**: `fabric_type`, `total_price`
- **Descriptive and specific**: `measurement_value` not just `value`
- **Units in name when ambiguous**: `time_spent_seconds`, `file_size_kb`
- **Boolean as question**: Properties that are true/false should read as questions

---

## Appendix C: Testing Scenarios

### Scenario 1: Complete Happy Path
1. Load configurator
2. Select fabric and color
3. Select edge type
4. Select corners
5. Select units and measurement option
6. Enter all dimensions
7. Configure anchor points
8. Review and add to cart
9. Verify all events fire correctly

### Scenario 2: Error Recovery
1. Try to proceed without selections
2. Enter invalid measurements
3. Dismiss typo suggestions
4. Accept typo suggestions
5. Navigate back and forward
6. Verify error events fire correctly

### Scenario 3: Alternative Paths
1. Test PDF download
2. Test email summary
3. Test currency change
4. Test canvas interactions
5. Test mobile navigation

---

## Appendix D: Common Issues & Troubleshooting

### Issue: Events not appearing in GA4
**Solution:** Check that GA4 tag is loaded and gtag function is available

### Issue: Properties missing from events
**Solution:** Verify custom dimensions are created in GA4

### Issue: Incorrect event timing
**Solution:** Check that useRef is used for step start time

### Issue: Duplicate events firing
**Solution:** Check useEffect dependencies and remove duplicate calls

### Issue: Mobile events not tracking
**Solution:** Test on actual mobile device, not just browser resize

---

## Support & Questions

For questions about this implementation:
- **Technical Issues**: Contact development team
- **GA4 Setup**: Contact analytics team
- **Reporting**: Contact marketing team

**Document Maintained By:** Development & Analytics Teams
**Last Updated:** October 10, 2025
**Next Review:** November 10, 2025
