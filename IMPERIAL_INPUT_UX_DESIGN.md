# Imperial Measurement Input - UX/UI Design Document

## Problem Statement

**Current Issue**: The existing system automatically converts all measurements to inches, which creates confusion for users who prefer to work in feet and inches. When a user enters "10'6"", they expect to see "10'6"" displayed, not "126"".

**User Pain Points**:
- Loss of mental model (users think in feet+inches, but see decimal inches)
- Cognitive overhead converting back to their preferred format
- Uncertainty about whether their input was captured correctly
- Format preference not respected

## Recommended Solution: Dual-Input with Format Preservation

### Design Overview

**Primary Approach**: Split imperial measurements into two separate input fields (feet and inches) with smart single-field fallback.

**Visual Layout**:
```
┌─────────────────────────────────────────────────┐
│  Shade Edge A → B                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  [ 10 ] ft  [ 6 ] in    (= 126")               │
│   ↑           ↑           ↑                     │
│  feet       inches    conversion                │
│  input      input     (subtle)                  │
│                                                 │
│  Or enter total:  [          ] in               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Features

#### 1. **Dual Input Fields (Primary Method)**
- **Feet Field**: Accepts whole or decimal numbers
- **Inches Field**: Accepts 0-11.99 (validates range)
- **Visual Hierarchy**: Side-by-side with clear labels
- **Tab Navigation**: Natural flow from feet → inches → next field

#### 2. **Format Preservation**
- Store user's input format preference: `{feet: 10, inches: 6}` OR `{totalInches: 126}`
- Display exactly what the user entered
- Never auto-convert display format unless explicitly requested

#### 3. **Conversion Display**
- Show equivalent in subtle gray text: `(= 126")`
- Position: Right side or below inputs
- Only appears when there's a value
- Non-intrusive, informational only

#### 4. **Single Field Alternative**
- Collapsible "Or enter total" option
- Accepts any format from the parser (5'6", 66", 66 in, etc.)
- When used, automatically populates the feet+inches fields
- Preserves original format in display

#### 5. **Smart Format Switching**
- Toggle button to switch between:
  - **Feet + Inches mode** (default for most users)
  - **Total Inches mode** (for users who prefer decimal)
- Preference saved per user session
- Smooth transition with value preservation

### User Interaction Flow

#### Flow 1: User Enters Feet + Inches (Primary)
1. User focuses on feet field
2. Types "10"
3. Presses Tab or clicks inches field
4. Types "6"
5. System shows: "10 ft 6 in (= 126")"
6. Value stored as: `{feet: 10, inches: 6, format: 'feet-inches'}`

#### Flow 2: User Enters Total Inches
1. User clicks "Or enter total"
2. Types "126" or "10'6"" or "10 feet 6 inches"
3. System auto-populates: Feet: 10, Inches: 6
4. Shows: "10 ft 6 in (= 126")"
5. Value stored as: `{feet: 10, inches: 6, format: 'feet-inches'}`

#### Flow 3: User Switches to Inches Mode
1. User clicks toggle "Show as inches"
2. Display changes to: "126 in (= 10'6")"
3. Input becomes single field with inches
4. Value stored as: `{totalInches: 126, format: 'inches-only'}`

### Display Format Specifications

#### Primary Display (Feet + Inches Mode)
```
Visual: [ 10 ] ft [ 6 ] in    (= 126")
           ↑         ↑            ↑
       primary   primary    conversion
       input     input      (gray, small)
```

#### Alternative Display (Inches Only Mode)
```
Visual: [ 126 ] in    (= 10'6")
            ↑             ↑
        primary     conversion
        input      (gray, small)
```

#### Mobile Responsive Design
```
Mobile (stacked):
┌──────────────────────┐
│ Feet    [ 10 ]       │
│ Inches  [ 6  ]       │
│ Total: 126"          │
└──────────────────────┘

Tablet/Desktop (inline):
┌────────────────────────────────┐
│ [ 10 ] ft  [ 6 ] in  (= 126") │
└────────────────────────────────┘
```

### Technical Implementation

#### Component Structure
```typescript
<EnhancedImperialInput
  value={{
    feet?: number;
    inches?: number;
    totalInches?: number;
    format: 'feet-inches' | 'inches-only';
  }}
  onChange={(value) => {...}}
  placeholder="Enter measurement"
  showConversion={true}
  allowFormatSwitch={true}
  defaultFormat="feet-inches"
/>
```

#### Data Storage Format
```typescript
interface ImperialMeasurement {
  // User's input
  feet?: number;
  inches?: number;
  totalInches?: number;

  // Metadata
  format: 'feet-inches' | 'inches-only';
  displayPreference: 'feet-inches' | 'inches-only';

  // Computed (always calculated for internal use)
  _computedTotalInches: number;
}
```

#### State Management
- Store format preference in localStorage per user
- Preserve format in saved quotes
- Allow per-field format override if needed

### Validation & Error Handling

#### Real-time Validation
- Feet: Must be non-negative number
- Inches: Must be 0-11.99 when used with feet
- Total inches: Must be positive number
- Show errors inline below field

#### Error States
```
❌ "Inches must be between 0 and 11"
❌ "Please enter a valid measurement"
✓ "10'6" = 126 inches" (success state)
```

### Alternative Solutions Considered

#### Option A: Single Auto-Parsing Field ❌
**What**: One text field that accepts any format (5'6", 66", etc.)
**Why Rejected**:
- Users don't know what formats are supported
- Error-prone for typos
- Format is lost on display
- Current implementation's problem

#### Option B: Dropdown Format Selector ❌
**What**: Dropdown to choose "feet+inches" or "inches"
**Why Rejected**:
- Extra step for users
- Not intuitive
- Adds visual clutter
- Slows down input

#### Option C: Inline Format Toggle Button ⚠️
**What**: Button next to input to switch format
**Why Partially Adopted**:
- Good as optional feature
- Not primary solution
- Used as enhancement to dual-input

#### Option D: Dual Input Fields ✅ (RECOMMENDED)
**What**: Separate feet and inches inputs
**Why Chosen**:
- Most intuitive and clear
- Matches user mental model
- No format ambiguity
- Easy validation
- Preserves user input
- Fast data entry
- Works well on mobile

### Accessibility Considerations

1. **Keyboard Navigation**: Proper tab order
2. **Screen Readers**: Clear labels for each field
3. **ARIA Labels**: Describe conversion values
4. **Focus Indicators**: Clear visual feedback
5. **Error Announcements**: Screen reader compatible

### Success Metrics

**User Experience**:
- ✅ User input format is preserved
- ✅ Conversions shown but not intrusive
- ✅ Clear what format is being used
- ✅ Fast input (no extra steps)
- ✅ Works on all devices

**Technical**:
- ✅ Maintains data accuracy
- ✅ Backward compatible with existing data
- ✅ Performant (no lag on input)
- ✅ Easy to maintain

## Implementation Priority

### Phase 1: Core Dual Input (Immediate)
- Create enhanced component with feet + inches fields
- Implement format preservation
- Add conversion display
- Update all measurement inputs

### Phase 2: Enhancements (Short-term)
- Add single-field quick input
- Implement format toggle
- Save user preference
- Add smart defaults based on measurement size

### Phase 3: Advanced Features (Future)
- Voice input for measurements
- Copy/paste from formatted text
- Batch measurement entry
- Measurement templates

## Conclusion

The **Dual Input Field** approach provides the best user experience by:
1. Matching user mental models
2. Preserving input format
3. Showing conversions non-intrusively
4. Supporting multiple workflows
5. Being intuitive and accessible

This design eliminates the confusion of auto-conversion while maintaining all technical functionality.
