# ShadeSpace Configurator - Frontend Development Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Dependencies Documentation](#dependencies-documentation)
4. [Code Independence Verification](#code-independence-verification)
5. [Component Inventory](#component-inventory)
6. [Build & Development Process](#build--development-process)
7. [Supabase Integration](#supabase-integration)
8. [Integration Guidelines](#integration-guidelines)
9. [Testing Checklist](#testing-checklist)

---

## Project Overview

**Application Name**: ShadeSpace Professional Shade Sail Configurator
**Framework**: React 18.3.1 with TypeScript
**Build Tool**: Vite 5.4.2
**Styling**: Tailwind CSS 3.4.1
**Current Location**: `/shade_space` directory

### Purpose
This is a standalone React application for configuring custom shade sails. It runs independently in this development environment for front-end updates, which are then synced to a production Shopify app environment by your developer.

### Key Features
- 7-step configuration process (Fabric → Edge → Corners → Dimensions → Heights → Review)
- Real-time pricing calculations with multi-currency support (NZD, USD, AUD, GBP, EUR, CAD)
- Interactive SVG-based visualization with measurement tools
- PDF quote generation (client-side and server-side via Supabase Edge Function)
- Responsive design for desktop and mobile

---

## Project Structure

```
shade_space/
├── src/
│   ├── components/          # React components
│   │   ├── steps/          # Configuration step components
│   │   │   ├── FabricSelectionContent.tsx
│   │   │   ├── EdgeTypeContent.tsx
│   │   │   ├── CornersContent.tsx
│   │   │   ├── CombinedMeasurementContent.tsx
│   │   │   ├── DimensionsContent.tsx
│   │   │   ├── FixingPointsContent.tsx
│   │   │   └── ReviewContent.tsx
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── ToastProvider.tsx
│   │   │   └── loader.tsx
│   │   ├── AccordionStep.tsx           # Step accordion wrapper
│   │   ├── HeightVisualizationCanvas.tsx
│   │   ├── InteractiveMeasurementCanvas.tsx
│   │   ├── PriceSummaryDisplay.tsx
│   │   ├── ShadeConfigurator.tsx       # Main component wrapper
│   │   ├── ShadeSVGCore.tsx           # Core SVG rendering
│   │   └── ShapeCanvas.tsx            # Shape preview canvas
│   ├── data/               # Static data and configuration
│   │   ├── fabrics.ts     # Fabric types, colors, specifications
│   │   └── pricing.ts     # Pricing tables, exchange rates
│   ├── hooks/             # Custom React hooks
│   │   └── useShadeCalculations.ts    # Pricing calculation logic
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts       # All interfaces and types
│   ├── utils/             # Utility functions
│   │   ├── currencyFormatter.ts
│   │   ├── geometry.ts            # Measurements, validations
│   │   ├── pdfGenerator.ts        # Client-side PDF generation
│   │   └── svgHelpers.ts          # SVG rendering helpers
│   ├── App.tsx            # Root application component
│   ├── ShadeConfigurator.tsx  # Main configurator logic
│   ├── main.tsx           # Application entry point
│   └── index.css          # Tailwind CSS imports
├── supabase/
│   └── functions/
│       └── generate-pdf/
│           └── index.ts   # Server-side PDF generation Edge Function
├── public/                # Static assets
├── index.html            # HTML entry point
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

### Total File Count
- **31 TypeScript/React files** (.tsx, .ts)
- **7 configuration files**
- **1 Supabase Edge Function**

---

## Dependencies Documentation

### Production Dependencies (8 packages)

| Package | Version | Purpose | Critical? |
|---------|---------|---------|-----------|
| `@headlessui/react` | ^2.2.9 | Accessible UI components (transitions, dialogs) | Yes |
| `@types/node` | ^24.2.1 | Node.js type definitions for TS | Yes |
| `html2canvas` | ^1.4.1 | Convert DOM to canvas for client-side PDF | Yes |
| `jspdf` | ^3.0.1 | Generate PDF documents client-side | Yes |
| `lucide-react` | ^0.344.0 | Icon library | Yes |
| `react` | ^18.3.1 | Core React library | **Critical** |
| `react-dom` | ^18.3.1 | React DOM rendering | **Critical** |
| `react-toastify` | ^11.0.5 | Toast notifications | Yes |

### Development Dependencies (15 packages)

| Package | Version | Purpose | Required for Build? |
|---------|---------|---------|---------------------|
| `@eslint/js` | ^9.9.1 | ESLint configuration | Optional |
| `@types/react` | ^18.3.5 | React type definitions | **Required** |
| `@types/react-dom` | ^18.3.0 | React DOM type definitions | **Required** |
| `@vitejs/plugin-react` | ^4.3.1 | Vite plugin for React | **Required** |
| `autoprefixer` | ^10.4.18 | PostCSS plugin for CSS prefixes | **Required** |
| `eslint` | ^9.9.1 | Linting tool | Optional |
| `eslint-plugin-react-hooks` | ^5.1.0-rc.0 | React hooks linting | Optional |
| `eslint-plugin-react-refresh` | ^0.4.11 | Fast Refresh linting | Optional |
| `globals` | ^15.9.0 | Global identifiers | Optional |
| `postcss` | ^8.4.35 | CSS transformation tool | **Required** |
| `tailwindcss` | ^3.4.1 | Utility-first CSS framework | **Required** |
| `terser` | ^5.43.1 | JavaScript minifier | **Required** |
| `typescript` | ^5.5.3 | TypeScript compiler | **Required** |
| `typescript-eslint` | ^8.3.0 | TypeScript ESLint support | Optional |
| `vite` | ^5.4.2 | Build tool and dev server | **Critical** |

### Dependency Notes for Developer Integration

1. **Version Matching**: Ensure these exact versions are used in production for consistency
2. **React Version**: Must be 18.3.1 - uses new React 18 features
3. **Vite**: Build configuration is optimized for these versions
4. **No Node Modules Conflicts**: All dependencies are self-contained within shade_space
5. **Security**: 8 vulnerabilities detected (2 low, 4 moderate, 2 high) - review with `npm audit`

---

## Code Independence Verification

✅ **Status**: FULLY INDEPENDENT - No external dependencies

### Verification Results

1. **No Parent Directory Imports**: All imports use relative paths within `shade_space/`
2. **No Shopify App Dependencies**: Zero references to parent Shopify app code
3. **Self-Contained Types**: All TypeScript types defined in `src/types/index.ts`
4. **Self-Contained Data**: All fabric and pricing data in `src/data/`
5. **Self-Contained Utilities**: All helper functions in `src/utils/`

### Import Analysis

All imports follow these patterns:
- Same directory: `import { X } from './file'`
- Parent directory: `import { X } from '../file'` (within shade_space only)
- Two levels up: `import { X } from '../../file'` (within shade_space only)

**Zero imports** escape the `shade_space/` directory boundary.

### Build Output Configuration

The `vite.config.ts` is configured to build to `../public/shadespace/`:
```typescript
outDir: "../public/shadespace/"
```

**Important for Integration**: Your developer needs to adjust this path for production or use the build output from `shade_space/dist/` after building.

---

## Component Inventory

### Core Configuration Components

| Component | Location | Purpose | Dependencies |
|-----------|----------|---------|--------------|
| `App.tsx` | `src/` | Root component | ShadeConfigurator |
| `ShadeConfigurator.tsx` | `src/` | Main state management & step logic | All step components |

### Step Components (Configuration Flow)

| Step | Component | File | Key Features |
|------|-----------|------|--------------|
| 1 | Fabric Selection | `components/steps/FabricSelectionContent.tsx` | 3 fabric types, 45+ colors |
| 2 | Edge Type | `components/steps/EdgeTypeContent.tsx` | Webbing or Cabled edge |
| 3 | Corners | `components/steps/CornersContent.tsx` | 3-6 corners selection |
| 4 | Measurements | `components/steps/CombinedMeasurementContent.tsx` | Units & measurement option |
| 5 | Dimensions | `components/steps/DimensionsContent.tsx` | Edge & diagonal inputs |
| 6 | Fixing Points | `components/steps/FixingPointsContent.tsx` | Heights & anchor details |
| 7 | Review | `components/steps/ReviewContent.tsx` | Summary & Add to Cart |

### Visualization Components

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `ShadeSVGCore.tsx` | Core SVG rendering | Polygon shape with measurements |
| `ShapeCanvas.tsx` | Shape preview | Interactive shape display |
| `InteractiveMeasurementCanvas.tsx` | Interactive measurement tool | Drag-and-drop measurements |
| `HeightVisualizationCanvas.tsx` | Height visualization | 3D-style height representation |
| `PriceSummaryDisplay.tsx` | Price display | Real-time price updates |

### UI Components (Reusable)

| Component | Purpose | Usage Count |
|-----------|---------|-------------|
| `Button.tsx` | Primary/secondary buttons | ~30+ instances |
| `Card.tsx` | Container cards | ~15+ instances |
| `Input.tsx` | Form inputs | ~20+ instances |
| `Tooltip.tsx` | Help tooltips | ~10+ instances |
| `ToastProvider.tsx` | Notifications | App-wide |
| `loader.tsx` | Loading spinner | PDF generation |

### Utility Modules

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `geometry.ts` | Measurements & validation | `calculatePolygonArea`, `validateMeasurements`, `convertMmToUnit` |
| `pdfGenerator.ts` | PDF creation | `generatePDF` (client + server-side) |
| `currencyFormatter.ts` | Currency formatting | `formatCurrency` |
| `svgHelpers.ts` | SVG utilities | `getOutwardPosition`, `getSelectedColor` |

### Data Modules

| Module | Contents | Update Frequency |
|--------|----------|------------------|
| `fabrics.ts` | 3 fabric types, 52 colors total, specs | Low (product changes) |
| `pricing.ts` | Pricing tables (9m-50m), exchange rates | Medium (pricing updates) |

---

## Build & Development Process

### Development Commands

```bash
# Install dependencies (in shade_space directory)
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Analyze bundle size
npm run build:analyze
```

### Development Server

- **URL**: http://localhost:5173 (auto-opens)
- **Hot Reload**: Enabled (instant updates)
- **Port**: 5173 (default Vite port)

### Build Configuration

**Output**: `../public/shadespace/` (configurable in `vite.config.ts`)

**Build Settings**:
- Base path: `./` (relative)
- Source maps: Disabled
- Minification: Terser
- Console logs: Preserved (not dropped)
- Bundle structure: Single bundle (inline dynamic imports)
- Output files:
  - `bundle.js` (JavaScript)
  - `bundle.css` (Styles)
  - `index.html` (Entry point)

**Build Process**:
```bash
npm run build
```

**Output Structure**:
```
../public/shadespace/
├── bundle.js       # All JavaScript (minified)
├── bundle.css      # All CSS (minified)
└── index.html      # Entry HTML
```

### Environment Variables

The app uses environment variables from `.env` (if present). Check if your developer needs to set:
- Supabase URL (for PDF generation)
- Supabase Anon Key (for PDF generation)

Currently, these are likely embedded in the build or handled by your production environment.

### Build Verification

After building, verify:
1. ✅ All files exist in output directory
2. ✅ No build errors or warnings
3. ✅ Bundle sizes are reasonable (<500KB for JS)
4. ✅ No console errors when opening built `index.html`

---

## Supabase Integration

### Edge Function: PDF Generation

**Location**: `supabase/functions/generate-pdf/index.ts`

**Purpose**: Server-side PDF generation using Puppeteer for reliable, high-quality PDFs

**Technology Stack**:
- Runtime: Deno
- PDF Engine: Puppeteer 21.5.0
- Supabase Functions: Deno std@0.168.0

**Endpoint**: `/functions/v1/generate-pdf` (POST)

**Request Format**:
```typescript
{
  "config": ConfiguratorState,
  "calculations": ShadeCalculations
}
```

**Response**: Binary PDF file

**CORS Headers**: Configured for cross-origin requests
```typescript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
```

### Integration Notes for Developer

1. **Function Deployment**: Edge Function must be deployed to Supabase project
2. **Environment**: Function runs in Deno runtime (not Node.js)
3. **Dependencies**: Uses npm: prefix for Puppeteer
4. **Timeout**: Set to 30 seconds for PDF generation
5. **Memory**: Puppeteer requires adequate memory allocation
6. **Client Usage**: Called from `src/utils/pdfGenerator.ts`

### PDF Generation Flow

1. User clicks "Download Quote" in Review step
2. Client attempts client-side generation (jsPDF + html2canvas)
3. If client-side fails or for production, calls Supabase Edge Function
4. Edge Function generates high-quality PDF with Puppeteer
5. PDF returned as downloadable file

### Database Usage

**Current Status**: No database persistence (all state is client-side)

**Potential Uses**:
- Save configurations for users
- Store quotes for follow-up
- Track configuration analytics

---

## Integration Guidelines

### Files That Must Not Change (Integration-Critical)

1. **Type Definitions** (`src/types/index.ts`)
   - Interfaces used across the application
   - Breaking changes will cause integration issues

2. **Data Structure** (`src/data/*.ts`)
   - Fabric IDs: `monotec370`, `extrablock330`, `shadetec320`
   - Pricing table structure
   - Currency codes: `NZD`, `USD`, `AUD`, `GBP`, `EUR`, `CAD`

3. **Build Output** (`vite.config.ts`)
   - Output directory path
   - Bundle naming convention
   - Entry point structure

### Safe to Modify

1. **UI Components** (`src/components/ui/*.tsx`)
   - Styling changes
   - Animation improvements
   - Accessibility enhancements

2. **Step Components** (`src/components/steps/*.tsx`)
   - Layout adjustments
   - Validation messages
   - Help text

3. **Styling** (`src/index.css`, Tailwind config)
   - Colors, spacing, typography
   - Responsive breakpoints
   - Theme adjustments

4. **Visualization** (`src/components/*Canvas.tsx`)
   - SVG rendering improvements
   - Interactive features
   - Visual enhancements

### Naming Conventions

- **Components**: PascalCase (e.g., `FabricSelectionContent.tsx`)
- **Utilities**: camelCase (e.g., `formatCurrency`)
- **Types**: PascalCase (e.g., `ConfiguratorState`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `EXCHANGE_RATES`)

### Code Style

- **TypeScript**: Strict mode enabled
- **Imports**: Relative paths only
- **Props**: Explicit interface definitions
- **State**: Minimal lifting, local when possible
- **Functions**: Pure functions preferred in utils

### State Management Pattern

The application uses a centralized state pattern in `ShadeConfigurator.tsx`:

```typescript
const [config, setConfig] = useState<ConfiguratorState>(INITIAL_STATE);
```

All state updates flow through `setConfig` with partial updates:
```typescript
setConfig({ ...config, fabricType: 'monotec370' });
```

### Adding New Features

When adding new features:

1. ✅ Keep all code within `shade_space/` directory
2. ✅ Update TypeScript types in `src/types/index.ts` if needed
3. ✅ Add new components in appropriate subdirectories
4. ✅ Follow existing component structure patterns
5. ✅ Test in development mode before building
6. ✅ Verify build succeeds without errors
7. ✅ Document any new dependencies
8. ✅ Commit with clear messages to the shared repository

### Pre-Sync Checklist

Before syncing changes to your developer:

- [ ] All TypeScript types are valid (no `any` types)
- [ ] No console errors in browser
- [ ] Build completes successfully (`npm run build`)
- [ ] No new dependencies added (or documented if added)
- [ ] All imports are relative (no absolute paths)
- [ ] Responsive design tested (mobile + desktop)
- [ ] All user flows tested manually
- [ ] Git commit messages are clear
- [ ] No sensitive data in code (API keys, passwords)

---

## Testing Checklist

### Configuration Flow Testing

Test all 7 steps in sequence:

1. **Fabric Selection**
   - [ ] All 3 fabric types selectable
   - [ ] All colors display correctly
   - [ ] Fabric details expand/collapse
   - [ ] "Next" button enables after selection

2. **Edge Type**
   - [ ] Webbing option selects correctly
   - [ ] Cabled edge option selects correctly
   - [ ] Descriptions display properly
   - [ ] Visual indicators show selection

3. **Corners**
   - [ ] 3, 4, 5, 6 corner options work
   - [ ] Shape preview updates
   - [ ] Measurement fields update for corner count

4. **Combined Measurement**
   - [ ] Metric/Imperial toggle works
   - [ ] "Adjust to fit space" option works
   - [ ] "Exact dimensions" option works
   - [ ] Currency selector works (6 currencies)

5. **Dimensions**
   - [ ] All edge inputs accept values
   - [ ] Diagonal inputs appear for 4+ corners
   - [ ] Interactive canvas allows dragging
   - [ ] Unit conversion works correctly
   - [ ] Validation catches invalid shapes
   - [ ] Typo detection suggests corrections

6. **Fixing Points/Heights**
   - [ ] Height inputs for each corner
   - [ ] Anchor type selection (post/building)
   - [ ] Eye orientation selection
   - [ ] Height visualization canvas displays
   - [ ] Unit conversion works

7. **Review**
   - [ ] All configuration details display
   - [ ] Price calculates correctly
   - [ ] PDF download works (client-side)
   - [ ] PDF download works (server-side if configured)
   - [ ] "Add to Cart" shows placeholder alert
   - [ ] Shape visualization renders correctly

### Pricing Validation

- [ ] Price updates in real-time
- [ ] Currency conversion is accurate
- [ ] Hardware cost shows only for "adjust" option
- [ ] Corner costs vary by corner count
- [ ] Edge type affects pricing (webbing vs. cabled)
- [ ] Price rounds up to nearest dollar

### Responsive Design Testing

- [ ] Desktop (1920x1080+): All elements visible
- [ ] Laptop (1366x768): No horizontal scroll
- [ ] Tablet (768x1024): Layout adapts
- [ ] Mobile (375x667): All steps accessible
- [ ] Touch interactions work on mobile

### Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Performance Testing

- [ ] Initial load < 3 seconds
- [ ] Step transitions are smooth
- [ ] No lag when dragging measurements
- [ ] PDF generation completes < 10 seconds
- [ ] No memory leaks during extended use

### Error Handling

- [ ] Invalid measurements show helpful errors
- [ ] Typo detection works (e.g., "3500mm" when "350mm" likely)
- [ ] Network errors handled gracefully
- [ ] PDF generation errors show user message
- [ ] Form validation prevents bad submissions

---

## Developer Handover Summary

### What This Environment Contains

✅ Complete, standalone React configurator application
✅ All source code in TypeScript with full type safety
✅ Self-contained dependencies (no parent project conflicts)
✅ Build configuration optimized for production
✅ Supabase Edge Function for PDF generation
✅ Comprehensive documentation for integration

### What Your Developer Needs to Do

1. **Clone the repository** you're syncing to
2. **Extract the `shade_space/` folder** contents
3. **Integrate into Shopify app** structure:
   - Adjust `vite.config.ts` output path if needed
   - Configure environment variables for production
   - Deploy Supabase Edge Function
   - Implement "Add to Cart" functionality (currently placeholder)
   - Set up Shopify product/cart integration

4. **Build for production**:
   ```bash
   cd shade_space
   npm install
   npm run build
   ```

5. **Deploy** built assets to appropriate hosting

### Integration Points for Production

1. **Add to Cart**: Replace placeholder in `src/components/steps/ReviewContent.tsx`
2. **Currency**: Sync with Shopify's currency system
3. **Product Data**: Optionally move fabric/pricing to Shopify Metafields
4. **Analytics**: Add tracking for user behavior
5. **Supabase**: Deploy Edge Function and configure credentials

---

## Conclusion

This frontend development environment is fully prepared for iterative front-end development. All code is self-contained, dependencies are documented, and the integration path is clear.

**You can safely make UI/UX improvements** without affecting the production Shopify app integration, as long as you follow the guidelines above.

**Your developer can seamlessly integrate** your changes by pulling from the shared repository and integrating the shade_space code into the production environment.

---

**Documentation Generated**: October 2025
**Version**: 1.0
**Status**: Ready for Frontend Development & Integration
