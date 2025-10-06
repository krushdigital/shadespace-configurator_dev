# ShadeSpace Configurator - Component Map

This document provides a visual map of all components and how they connect.

---

## 🗺️ Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                               │
│                              │                                   │
│                              ▼                                   │
│                         main.tsx                                 │
│                              │                                   │
│                              ▼                                   │
│                         App.tsx                                  │
│                              │                                   │
│                              ▼                                   │
│                    ShadeConfigurator.tsx                         │
│                    (Main State Manager)                          │
│                              │                                   │
│         ┌────────────────────┴────────────────────┐            │
│         │                                          │            │
│         ▼                                          ▼            │
│  AccordionStep (Wrapper)              PriceSummaryDisplay       │
│         │                                                       │
│         └──► Step Components                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Component Hierarchy

### Level 1: Entry Points

```
main.tsx (Entry)
└─► App.tsx (Root)
    └─► ShadeConfigurator.tsx (Main Logic)
```

### Level 2: Main Layout Components

```
ShadeConfigurator.tsx
├─► ToastProvider (Notifications)
├─► PriceSummaryDisplay (Always visible)
└─► AccordionStep × 7 (Step Wrappers)
    └─► Step Content Components
```

### Level 3: Step Components

```
Step 1: FabricSelectionContent
Step 2: EdgeTypeContent
Step 3: CornersContent
Step 4: CombinedMeasurementContent
Step 5: DimensionsContent
        ├─► InteractiveMeasurementCanvas
        └─► ShapeCanvas
            └─► ShadeSVGCore
Step 6: FixingPointsContent
        └─► HeightVisualizationCanvas
Step 7: ReviewContent
        ├─► ShapeCanvas
        │   └─► ShadeSVGCore
        └─► generatePDF (utility)
```

### Level 4: Reusable UI Components

Used throughout all steps:

```
Button.tsx          (Primary/Secondary buttons)
Card.tsx            (Container cards)
Input.tsx           (Form inputs)
Tooltip.tsx         (Help tooltips)
loader.tsx          (Loading spinner)
```

---

## 🔄 Data Flow

### State Management

```
┌─────────────────────────────────────────────────────────┐
│  ShadeConfigurator.tsx                                   │
│                                                          │
│  const [config, setConfig] = useState<ConfiguratorState> │
│                                                          │
│  • fabricType                                           │
│  • fabricColor                                          │
│  • edgeType                                             │
│  • corners                                              │
│  • unit                                                 │
│  • measurementOption                                    │
│  • measurements                                         │
│  • fixingHeights                                        │
│  • fixingTypes                                          │
│  • eyeOrientations                                      │
│  • currency                                             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├─► FabricSelectionContent (reads/updates)
                  ├─► EdgeTypeContent (reads/updates)
                  ├─► CornersContent (reads/updates)
                  ├─► CombinedMeasurementContent (reads/updates)
                  ├─► DimensionsContent (reads/updates)
                  ├─► FixingPointsContent (reads/updates)
                  └─► ReviewContent (reads only)
```

### Pricing Calculations

```
┌──────────────────────────────────────────────────────────┐
│  config (ConfiguratorState)                               │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  useShadeCalculations.ts (Custom Hook)                    │
│                                                           │
│  Inputs:                                                  │
│  • config.measurements                                    │
│  • config.fabricType                                      │
│  • config.edgeType                                        │
│  • config.corners                                         │
│  • config.measurementOption                               │
│  • config.currency                                        │
│                                                           │
│  Processing:                                              │
│  • Calculate perimeter                                    │
│  • Calculate area (triangulation)                         │
│  • Look up fabric pricing                                 │
│  • Apply corner costs                                     │
│  • Apply hardware costs (if needed)                       │
│  • Convert currency                                       │
│  • Apply markups                                          │
│                                                           │
│  Outputs:                                                 │
│  • area (m²)                                              │
│  • perimeter (m)                                          │
│  • fabricCost                                             │
│  • edgeCost                                               │
│  • hardwareCost                                           │
│  • totalPrice                                             │
│  • webbingWidth / wireThickness                           │
│  • totalWeightGrams                                       │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│  calculations (ShadeCalculations)                         │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ├─► PriceSummaryDisplay (renders price)
                 └─► ReviewContent (displays summary)
```

---

## 📋 Component Details

### Core Components

#### ShadeConfigurator.tsx
**Purpose**: Main application logic and state management
**State**: Manages entire `ConfiguratorState`
**Features**:
- Step navigation (accordion-style)
- State updates from child components
- Validation orchestration
- Step completion logic

**Key Functions**:
- `handleConfigUpdate()` - Updates configuration state
- `isStepComplete()` - Validates step completion
- `handleNext()` / `handlePrevious()` - Navigation

#### AccordionStep.tsx
**Purpose**: Wrapper for each configuration step
**Props**:
- `step: number` - Step number (1-7)
- `title: string` - Step title
- `isComplete: boolean` - Completion status
- `isOpen: boolean` - Accordion open state
- `onClick: () => void` - Click handler
- `children: React.ReactNode` - Step content

**Features**:
- Expand/collapse animation
- Completion indicator
- Step numbering

#### PriceSummaryDisplay.tsx
**Purpose**: Shows real-time pricing
**Props**:
- `calculations: ShadeCalculations` - Pricing data
- `currency: string` - Currency code

**Features**:
- Price breakdown (fabric, edge, hardware)
- Total price display
- Currency formatting
- Responsive sizing

---

### Step Components

#### 1. FabricSelectionContent.tsx
**Purpose**: Select fabric type and color
**State Updates**:
- `config.fabricType` - Fabric ID
- `config.fabricColor` - Color name

**Features**:
- 3 fabric type cards (Monotec, ExtraBlock, Shadetec)
- Color palette for selected fabric
- Expandable fabric details
- Warranty and specs display

**Data Source**: `src/data/fabrics.ts`

#### 2. EdgeTypeContent.tsx
**Purpose**: Choose edge reinforcement type
**State Updates**:
- `config.edgeType` - 'webbing' or 'cabled'

**Features**:
- Two option cards
- Visual icons/descriptions
- Price difference indication
- Technical specifications

#### 3. CornersContent.tsx
**Purpose**: Select number of fixing points
**State Updates**:
- `config.corners` - 3, 4, 5, or 6

**Features**:
- Four corner option buttons
- Shape preview updates
- Configuration reset on change

#### 4. CombinedMeasurementContent.tsx
**Purpose**: Set measurement preferences
**State Updates**:
- `config.unit` - 'metric' or 'imperial'
- `config.measurementOption` - 'adjust' or 'exact'
- `config.currency` - Currency code

**Features**:
- Unit toggle (metric/imperial)
- Manufacturing option selection
- Currency dropdown (6 currencies)
- Hardware explanation

**Data Source**: `src/data/pricing.ts` (currencies)

#### 5. DimensionsContent.tsx
**Purpose**: Input edge and diagonal measurements
**State Updates**:
- `config.measurements` - All edge and diagonal values

**Features**:
- Dynamic input fields (based on corners)
- Interactive measurement canvas (drag to measure)
- Unit conversion
- Real-time validation
- Typo detection and suggestions
- Shape validity checking

**Sub-components**:
- `InteractiveMeasurementCanvas` - Drag-and-drop interface
- `ShapeCanvas` - Static shape preview
- `ShadeSVGCore` - SVG rendering engine

**Utilities**:
- `validateMeasurements()` - Checks shape validity
- `getDiagonalKeysForCorners()` - Required diagonals
- `convertUnitToMm()` / `convertMmToUnit()` - Unit conversion

#### 6. FixingPointsContent.tsx
**Purpose**: Configure anchor point heights and types
**State Updates**:
- `config.fixingHeights` - Height for each corner
- `config.fixingTypes` - 'post' or 'building' per corner
- `config.eyeOrientations` - 'horizontal' or 'vertical' per corner

**Features**:
- Height inputs for each corner (A, B, C...)
- Anchor type selection
- Eye orientation selection
- Height visualization canvas (3D-style)
- Unit conversion

**Sub-components**:
- `HeightVisualizationCanvas` - Visual height comparison

#### 7. ReviewContent.tsx
**Purpose**: Review configuration and purchase
**State**: Read-only, displays all configuration data

**Features**:
- Complete configuration summary
- Fabric details display
- Measurements table
- Anchor points list
- Shape visualization
- Price breakdown
- Terms acceptance
- PDF download
- Add to Cart button (placeholder)

**Actions**:
- `generatePDF()` - Creates downloadable quote
- `handleAddToCart()` - Placeholder for cart integration

---

### Visualization Components

#### ShadeSVGCore.tsx
**Purpose**: Core SVG rendering engine
**Props**:
- `config: ConfiguratorState`
- `showMeasurements: boolean`
- Various display options

**Features**:
- Polygon shape rendering
- Corner labels (A, B, C...)
- Edge measurements display
- Diagonal measurements display
- Fabric color fill
- Responsive scaling
- Export capability

**Utilities**:
- `formatMeasurement()` - Display measurements
- Gets fabric color from config

#### ShapeCanvas.tsx
**Purpose**: Static shape preview wrapper
**Props**: Similar to ShadeSVGCore

**Features**:
- Card-based container
- Title display
- Wraps ShadeSVGCore
- Fixed aspect ratio

#### InteractiveMeasurementCanvas.tsx
**Purpose**: Interactive drag-to-measure interface
**Props**:
- `config: ConfiguratorState`
- `onUpdateMeasurement: (key, value) => void`

**Features**:
- Click and drag measurement lines
- Real-time value updates
- Visual feedback
- Unit conversion on the fly
- Snapping to corners
- Highlight on hover

**Interaction**:
- Drag measurement lines to adjust
- Auto-updates config state
- Visual measurement labels

#### HeightVisualizationCanvas.tsx
**Purpose**: 3D-style height visualization
**Props**:
- `config: ConfiguratorState`

**Features**:
- Side-view perspective
- Height comparison bars
- Anchor type icons
- Ground reference line
- Relative height scaling

---

### UI Components (Reusable)

#### Button.tsx
**Props**:
- `variant: 'primary' | 'secondary'`
- `size: 'sm' | 'md' | 'lg'`
- `disabled: boolean`
- `onClick: () => void`

**Variants**:
- Primary: Lime green background
- Secondary: Outlined style

#### Card.tsx
**Props**:
- `title?: string`
- `children: React.ReactNode`
- `className?: string`

**Features**:
- Consistent shadow/border
- Rounded corners
- Optional title section

#### Input.tsx
**Props**:
- `label: string`
- `value: string | number`
- `onChange: (value) => void`
- `type: 'text' | 'number'`
- `error?: string`
- `helper?: string`

**Features**:
- Label with tooltip support
- Error message display
- Helper text
- Validation state styling

#### Tooltip.tsx
**Props**:
- `content: string`
- `children: React.ReactNode`

**Features**:
- Hover activation
- Positioned intelligently
- Accessible

#### ToastProvider.tsx
**Purpose**: Global notification system
**Library**: react-toastify

**Toast Types**:
- `toast.success()` - Success messages
- `toast.error()` - Error messages
- `toast.info()` - Information
- `toast.warning()` - Warnings

#### loader.tsx
**Purpose**: Loading spinner
**Used In**: PDF generation

---

## 🔧 Utility Modules

### geometry.ts
**Functions**:
- `calculatePolygonArea()` - Area via triangulation
- `validateMeasurements()` - Shape validity check
- `validateHeights()` - Height validation
- `convertMmToUnit()` - Metric to imperial
- `convertUnitToMm()` - Imperial to metric
- `formatMeasurement()` - Display formatting
- `formatArea()` - Area display
- `getDiagonalKeysForCorners()` - Required diagonals

### pdfGenerator.ts
**Functions**:
- `generatePDF()` - Client-side PDF creation
  - Uses html2canvas to capture DOM
  - Uses jsPDF to create PDF
  - Falls back to server-side if fails

**Integration**: Calls Supabase Edge Function for server-side generation

### currencyFormatter.ts
**Functions**:
- `formatCurrency()` - Format price with symbol

**Data Source**: `src/data/pricing.ts` (currency symbols)

### svgHelpers.ts
**Functions**:
- `getOutwardPosition()` - Calculate label positions
- `getSelectedColor()` - Get fabric color
- `generatePoints()` - Calculate polygon points

---

## 📊 Data Modules

### fabrics.ts
**Exports**:
- `FABRICS: Fabric[]` - Array of 3 fabric types

**Structure**:
```typescript
{
  id: FabricType,
  label: string,
  description: string,
  benefits: string[],
  colors: FabricColor[],  // 52 total colors
  pricePerSqm: number,
  warrantyYears: number,
  madeIn: string,
  weightPerSqm: number
}
```

### pricing.ts
**Exports**:
- `WEBBING_FABRIC_PRICING` - Pricing table (9m-50m)
- `CABLED_FABRIC_PRICING` - Cabled pricing table
- `CORNER_COSTS` - Cost by corner count
- `CABLED_CORNER_COSTS` - Cabled corner costs
- `HARDWARE_COSTS` - Hardware pack costs
- `CABLED_HARDWARE_COSTS` - Cabled hardware
- `WEBBING_FEATURES` - Webbing width specs
- `CABLED_FEATURES` - Wire thickness specs
- `EXCHANGE_RATES` - Currency conversion
- `CURRENCY_MARKUPS` - Regional markups
- `BASE_PRICING_MARKUP` - Base margin
- `CURRENCY_SYMBOLS` - Display symbols
- `CURRENCY_NAMES` - Full names

**Helper Functions**:
- `getFabricPriceFromPerimeter()` - Lookup pricing
- `getWebbingWidth()` - Get webbing size
- `getWireThickness()` - Get wire size

---

## 🎯 Component Usage Statistics

| Component | Usage Count | Where Used |
|-----------|-------------|------------|
| Button | ~30+ | All step components |
| Card | ~15+ | Layout containers |
| Input | ~20+ | DimensionsContent, FixingPointsContent |
| Tooltip | ~10+ | Help icons throughout |
| ShadeSVGCore | 3 | DimensionsContent, FixingPointsContent, ReviewContent |
| ShapeCanvas | 2 | DimensionsContent, ReviewContent |

---

## 📱 Responsive Breakpoints

Components adapt at these breakpoints:

- **Mobile**: < 768px
  - Single column layout
  - Stacked cards
  - Compact measurements

- **Tablet**: 768px - 1024px
  - Two column where possible
  - Medium spacing

- **Desktop**: > 1024px
  - Full layout
  - Side-by-side content
  - Maximum spacing

---

## 🎨 Styling Approach

### Tailwind Classes Used Throughout

**Colors**:
- Primary: `bg-lime-400`, `text-lime-400`
- Dark: `bg-gray-900`, `text-gray-900`
- Light: `bg-gray-100`, `text-gray-600`

**Spacing**:
- Padding: `p-4`, `p-6`, `p-8`
- Margin: `mb-4`, `mb-6`, `mt-8`
- Gap: `gap-4`, `space-y-4`

**Typography**:
- Headings: `text-xl`, `text-2xl`, `font-bold`
- Body: `text-base`, `text-gray-700`
- Small: `text-sm`, `text-xs`

---

## 🔍 Component Search Guide

Looking for specific functionality? Here's where to find it:

| Functionality | Component | File |
|---------------|-----------|------|
| Fabric selection | FabricSelectionContent | steps/FabricSelectionContent.tsx |
| Color picker | FabricSelectionContent | steps/FabricSelectionContent.tsx |
| Edge type | EdgeTypeContent | steps/EdgeTypeContent.tsx |
| Corner count | CornersContent | steps/CornersContent.tsx |
| Unit selection | CombinedMeasurementContent | steps/CombinedMeasurementContent.tsx |
| Currency | CombinedMeasurementContent | steps/CombinedMeasurementContent.tsx |
| Edge inputs | DimensionsContent | steps/DimensionsContent.tsx |
| Diagonal inputs | DimensionsContent | steps/DimensionsContent.tsx |
| Interactive measuring | InteractiveMeasurementCanvas | InteractiveMeasurementCanvas.tsx |
| Height inputs | FixingPointsContent | steps/FixingPointsContent.tsx |
| Anchor types | FixingPointsContent | steps/FixingPointsContent.tsx |
| Summary | ReviewContent | steps/ReviewContent.tsx |
| PDF generation | generatePDF | utils/pdfGenerator.ts |
| Price display | PriceSummaryDisplay | PriceSummaryDisplay.tsx |
| Shape rendering | ShadeSVGCore | ShadeSVGCore.tsx |
| Pricing logic | useShadeCalculations | hooks/useShadeCalculations.ts |
| Validation | geometry.ts | utils/geometry.ts |

---

This map should help you navigate the codebase and understand how everything connects! 🗺️
