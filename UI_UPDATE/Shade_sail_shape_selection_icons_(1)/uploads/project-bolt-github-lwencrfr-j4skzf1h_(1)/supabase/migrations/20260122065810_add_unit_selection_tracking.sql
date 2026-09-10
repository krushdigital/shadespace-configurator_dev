/*
  # Add Unit Selection Tracking

  ## Purpose
  Track automated unit selection behavior and manual overrides to refine currency-to-unit mappings.

  ## Changes
  1. Add new event types for unit selection tracking
  2. No schema changes needed - uses existing user_events table with event_data JSON field

  ## New Event Types
  - `unit_auto_selected`: Fired when unit is automatically selected based on currency
  - `unit_manually_changed`: Fired when user manually switches from one unit to another

  ## Event Data Fields

  ### unit_auto_selected
  {
    "unit": "metric" | "imperial",
    "currency": "NZD" | "USD" | "AUD" | "GBP" | "EUR" | "CAD" | "AED",
    "selection_source": "saved_quote" | "user_preference" | "currency_mapping" | "default",
    "confidence_level": "high" | "medium" | "low"
  }

  ### unit_manually_changed
  {
    "from_unit": "metric" | "imperial",
    "to_unit": "metric" | "imperial",
    "currency": "NZD" | "USD" | "AUD" | "GBP" | "EUR" | "CAD" | "AED",
    "was_auto_selected": boolean
  }

  ## Analytics Use Cases
  - Identify currencies where users frequently override auto-selection
  - Calculate override rates by currency to refine mapping confidence
  - Detect regional patterns in unit preferences
  - Improve user experience by adjusting auto-selection logic
*/

-- No schema changes needed
-- The existing user_events table already supports these event types via the event_data JSONB column

-- Query examples for analytics:

-- 1. Unit override rate by currency
-- SELECT 
--   event_data->>'currency' as currency,
--   COUNT(*) as manual_changes
-- FROM user_events 
-- WHERE event_type = 'unit_manually_changed'
-- GROUP BY event_data->>'currency'
-- ORDER BY manual_changes DESC;

-- 2. Auto-selection effectiveness
-- SELECT 
--   event_data->>'currency' as currency,
--   event_data->>'confidence_level' as confidence,
--   COUNT(*) as auto_selections
-- FROM user_events 
-- WHERE event_type = 'unit_auto_selected'
-- GROUP BY event_data->>'currency', event_data->>'confidence_level';

-- 3. Unit preference trends
-- SELECT 
--   event_data->>'currency' as currency,
--   event_data->>'unit' as preferred_unit,
--   COUNT(*) as selections
-- FROM user_events 
-- WHERE event_type = 'unit_auto_selected'
-- GROUP BY event_data->>'currency', event_data->>'unit'
-- ORDER BY currency, selections DESC;
