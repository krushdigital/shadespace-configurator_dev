# Imperial Measurement Input System

## Overview
The application now supports flexible imperial measurement input, allowing users to enter measurements in various feet and inches formats. All inputs are automatically parsed and converted to a consistent unit for internal processing.

## Supported Input Formats

### 1. Feet and Inches with Symbols
- `5'6"` - Five feet six inches
- `5' 6"` - Five feet six inches (with space)
- `10'0"` - Ten feet

### 2. Feet and Inches with Words
- `5 feet 6 inches` - Full words
- `5ft 6in` - Abbreviated
- `5 ft 6 in` - Abbreviated with spaces
- `10 feet 0 inches` - Ten feet

### 3. Feet Only
- `5'` - Five feet (symbol)
- `5 feet` - Five feet (word)
- `5ft` - Five feet (abbreviated)
- `5 ft` - Five feet (abbreviated with space)

### 4. Inches Only
- `66"` - Sixty-six inches (symbol)
- `66 inches` - Sixty-six inches (word)
- `66in` - Sixty-six inches (abbreviated)
- `66 in` - Sixty-six inches (abbreviated with space)
- `66` - Plain number (defaults to inches for backward compatibility)

### 5. Mixed Formats
- `5 feet 6"` - Feet as word, inches as symbol
- `5' 6 inches` - Feet as symbol, inches as word

## User Experience Features

### Visual Feedback
- **Conversion Hints**: When users enter measurements in feet and inches, a blue tooltip appears showing:
  - The standardized format (e.g., `5' 6"`)
  - The total in decimal inches (e.g., `= 66"`)

### Input Validation
- Inches must be between 0-11 when entering feet and inches together
- Negative values are not accepted
- Clear error messages for invalid formats

### Format Examples in Placeholders
- Edge measurements: `120 or 10'0"`
- Diagonal measurements: `240 or 20'0"`
- Height measurements: `100 or 8'4"`

## Technical Implementation

### Core Components

#### `imperialParser.ts`
Utility functions for parsing and validating imperial measurements:
- `parseImperialMeasurement(input: string): ImperialParseResult`
- `inchesToFeetInches(totalInches: number)`
- `validateMeasurementRange(totalInches: number, min?, max?)`

#### `ImperialMeasurementInput.tsx`
React component that wraps the base Input component with imperial parsing:
- Automatically detects and parses various input formats
- Shows conversion hints when feet are used
- Maintains backward compatibility with plain number inputs
- Works seamlessly with metric mode (no parsing needed)

### Updated Components
The following components now use `ImperialMeasurementInput`:
- `DimensionsContent.tsx` - Edge and diagonal measurements
- `ConfigurationChecklist.tsx` - Diagonal and height measurements
- `FixingPointsContent.tsx` - Height measurements

## Conversion Formula
```
Total inches = (feet × 12) + inches
```

Example:
- Input: `5'6"`
- Calculation: (5 × 12) + 6 = 66 inches
- Stored internally: 66 inches

## Backward Compatibility
- Plain numbers (e.g., `66`) are interpreted as inches
- All existing functionality remains intact
- Metric mode is unaffected by these changes

## Examples for Users

### Entering a 10-foot shade edge:
- `10'` ✓
- `10 feet` ✓
- `10ft` ✓
- `120` ✓ (120 inches)
- `120"` ✓

### Entering a height of 8 feet 4 inches:
- `8'4"` ✓
- `8 feet 4 inches` ✓
- `8ft 4in` ✓
- `100` ✓ (100 inches)
- `100"` ✓

### Entering a diagonal of 20 feet:
- `20'` ✓
- `20 feet` ✓
- `240` ✓ (240 inches)
- `240"` ✓
