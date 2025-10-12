# ShadeSpace Professional Shade Sail Configurator

This project is a professional shade sail configurator application, built with React and Vite, designed to allow customers to customize their shade sails, visualize them, and receive an instant quote. It integrates with various data sources for fabric types, pricing, and currency conversion, and is prepared for integration into a Shopify e-commerce environment.

## Project Overview

The ShadeSpace Configurator guides users through a multi-step process to design their custom shade sail:

1.  **Fabric & Color Selection**: Choose from various fabric types and colors.
2.  **Edge Reinforcement Style**: Select between 'Webbing Reinforced' or 'Cabled Edge'.
3.  **Number of Fixing Points**: Define the number of corners (3, 4, 5, or 6).
4.  **Measurement Options**: Specify units (metric/imperial) and manufacturing option ('Adjust to fit space' or 'Exact dimensions').
5.  **Dimensions**: Input precise edge and diagonal measurements, with interactive visual feedback.
6.  **Heights & Anchor Points**: Configure the height, type (post/building), and eye orientation for each anchor point.
7.  **Review & Purchase**: Review the configuration, acknowledge terms, and proceed to purchase.

The application provides real-time pricing calculations, interactive diagrams, and the ability to generate a PDF quote.

## Technology Stack

*   **Frontend**: React (with TypeScript), Vite
*   **Styling**: Tailwind CSS
*   **PDF Generation**: `jspdf` and `html2canvas` (client-side), with a Supabase Edge Function using Puppeteer for server-side PDF generation.
*   **Utility Libraries**: `lucide-react` for icons.
*   **Data Management**: Hardcoded data for fabrics and pricing (`src/data/fabrics.ts`, `src/data/pricing.ts`).

## Developer Handover Notes

### 1. Project Structure

*   `public/`: Static assets.
*   `src/`: Main application source code.
    *   `assets/`: Images and other static assets used in the app.
    *   `components/`: Reusable React components (e.g., `Button`, `Card`, `Input`, `Tooltip`).
        *   `steps/`: Components for each step of the configurator (`FabricSelectionContent`, `DimensionsContent`, etc.).
        *   `ui/`: Generic UI components.
    *   `data/`: Static data for fabrics and pricing (`fabrics.ts`, `pricing.ts`).
    *   `hooks/`: Custom React hooks (`useShadeCalculations.ts`).
    *   `types/`: TypeScript type definitions (`index.ts`).
    *   `utils/`: Utility functions (e.g., `geometry.ts` for unit conversions and validation, `pdfGenerator.ts` for client-side PDF generation, `currencyFormatter.ts`).
    *   `App.tsx`: Main application component.
    *   `main.tsx`: Entry point for the React application.
    *   `index.css`: Tailwind CSS imports and custom styles.
*   `supabase/functions/`: Supabase Edge Functions.
    *   `generate-pdf/`: Deno-based function for server-side PDF generation using Puppeteer.
*   `tailwind.config.js`: Tailwind CSS configuration.
*   `vite.config.ts`: Vite build configuration.

### 2. Key Functionality & Logic

*   **State Management**: The main configuration state (`ConfiguratorState`) is managed in `src/ShadeConfigurator.tsx` using `useState`. Updates are passed down via props.
*   **Pricing Logic**: `src/hooks/useShadeCalculations.ts` contains the core pricing logic. It calculates area, perimeter, and costs based on selected fabric, edge type, and measurements. Pricing data is sourced from `src/data/pricing.ts`.
*   **Measurement Validation**: `src/utils/geometry.ts` handles unit conversions (mm, inches, feet) and includes robust validation with typo detection and suggestions for user-entered measurements and heights.
*   **Interactive Diagram**: `src/components/ShapeCanvas.tsx` and `src/components/InteractiveMeasurementCanvas.tsx` render the interactive SVG diagram. `src/components/ShadeSVGCore.tsx` is the core SVG rendering component.
*   **PDF Generation**:
    *   **Client-side**: `src/utils/pdfGenerator.ts` uses `html2canvas` and `jspdf` to generate a PDF directly in the browser. This is primarily for immediate user download.
    *   **Server-side (Supabase Edge Function)**: `supabase/functions/generate-pdf/index.ts` provides a more robust PDF generation using Puppeteer. This is crucial for reliable PDF generation, especially for emailing quotes, as client-side generation can be inconsistent across browsers or for complex layouts.

### 3. Code Cleanup & Best Practices

*   **Removed Console Logs**: All non-essential `console.log` statements have been removed to ensure a clean console in production. Critical error logging remains.
*   **Removed Dead Code**: Commented-out or unused code sections, particularly related to IP-based currency detection, have been removed.
*   **Consistent Styling**: Tailwind CSS is used consistently for styling.
*   **TypeScript**: The project uses TypeScript for type safety and improved developer experience.

## Shopify Technical Implementation Plan

Integrating this React application into a Shopify store requires careful planning, especially concerning data management, currency handling, and the "Add to Cart" flow.

### 1. Embedding the React Application

The React application can be embedded into a Shopify page (e.g., `/pages/shade-configurator`) using one of the following methods:

*   **Shopify Theme Section/Block**: The most common approach. Build the React app, then embed the compiled `index.html` and JavaScript/CSS bundles into a custom Shopify theme section or block. This allows the app to be managed directly within the Shopify admin.
*   **Shopify App (Headless/Frontend)**: For more complex integrations or if the app needs to interact deeply with Shopify APIs (e.g., product creation), a custom Shopify App might be considered. This is more involved but offers greater control.

**Recommendation**: Start with embedding as a theme section/block. This is simpler and sufficient for a configurator that outputs a product to the cart.

### 2. Data Management (Fabrics & Pricing)

Currently, fabric and pricing data are hardcoded in `src/data/fabrics.ts` and `src/data/pricing.ts`. For a production Shopify store, consider these options:

*   **Shopify Metafields**: Store fabric details (description, benefits, UV protection, warranty, image URLs) and pricing tiers as Shopify Metafields on dummy products or a custom content type. This allows non-developers to manage the data via the Shopify admin.
*   **Shopify Products/Variants**: Represent each fabric type as a Shopify product, and colors as variants. Pricing could then be managed directly through Shopify's product pricing. This might require a more complex mapping in the React app.
*   **External Database (e.g., Supabase)**: Host the data in a Supabase database. The React app would fetch data from this database. This offers maximum flexibility but adds an external dependency.

**Recommendation**: For initial deployment, continue with hardcoded data if changes are infrequent. For scalability and ease of management, migrate to Shopify Metafields.

### 3. Currency Handling

The current application includes logic for IP-based currency detection and uses `EXCHANGE_RATES` and `CURRENCY_MARKUPS` from `src/data/pricing.ts`.

*   **IP Address Currency Detection**: The commented-out IP-based currency detection in `src/ShadeConfigurator.tsx` was removed for code cleanliness. In a Shopify environment, it's generally best to rely on Shopify's built-in currency handling. Shopify automatically detects the user's currency based on their location or allows them to select it.
*   **Shopify Multi-Currency**: If the Shopify store supports multiple currencies, the frontend application should ideally fetch the current currency from Shopify's Liquid objects or JavaScript API.
    *   You can access the current currency code via Liquid (e.g., `{{ cart.currency.iso_code }}` or `{{ shop.currency }}`) and pass it as a prop to your React app's root element.
    *   Alternatively, use Shopify's `Shopify.currency.active` JavaScript object if available.
*   **Currency Rates**: The `EXCHANGE_RATES` and `CURRENCY_MARKUPS` in `src/data/pricing.ts` are static. For dynamic and accurate currency conversion, these should ideally be fetched from a reliable API or managed within Shopify's own currency settings. If using Shopify's multi-currency feature, the final price passed to the cart should be in the store's base currency, and Shopify will handle the display currency conversion.

**Recommendation**:
1.  Remove the `currency` state from `ConfiguratorState` in `src/types/index.ts` and `INITIAL_STATE` in `src/ShadeConfigurator.tsx`.
2.  Pass the active currency from Shopify (via Liquid or JS) as a prop to the `ShadeConfigurator` component.
3.  Modify `useShadeCalculations.ts` to use this passed currency for final price formatting, but ensure the core calculations are done in a single base currency (e.g., NZD) and then converted for display. Shopify will handle the final conversion for checkout.

### 4. "Add to Cart" Functionality

The `handleAddToCart` function currently shows an alert. This needs to be replaced with actual Shopify cart integration.

*   **Shopify AJAX Cart API**: The most common way to add items to the cart without a full page reload.
    *   When the user clicks "Add to Cart", construct a JSON payload with the configured shade sail details (fabric, color, dimensions, etc.) as **line item properties**.
    *   The `id` in the payload would typically refer to a pre-existing "custom product" in Shopify, or a specific variant of a custom product.
    *   Send a POST request to `/cart/add.js`.
    *   Example payload:
        ```json
        {
          "items": [
            {
              "id": YOUR_SHOPIFY_PRODUCT_VARIANT_ID, // ID of a generic "Custom Shade Sail" product variant
              "quantity": 1,
              "properties": {
                "Fabric Type": "Monotec 370",
                "Fabric Color": "Koonunga Green",
                "Edge Type": "Webbing Reinforced",
                "Corners": "4",
                "Unit": "Metric",
                "Measurement Option": "Adjust to fit space",
                "Edge A-B": "3000mm",
                "Edge B-C": "3000mm",
                // ... all other measurements and configuration details
                "Total Price": "NZ$3404.00" // For display, Shopify will calculate actual price
              }
            }
          ]
        }
        ```
*   **Pricing**: Shopify's cart API expects a product variant ID. The actual price of the custom product needs to be handled.
    *   **Fixed Price**: If all custom sails are a fixed price, use a standard product variant.
    *   **Dynamic Price (Draft Orders / Custom Apps)**: For truly dynamic pricing based on the configurator's calculation, you might need to use Shopify's Draft Orders API (requires a custom app) or a third-party app that supports dynamic product pricing.
    *   **Price Override (Post-Purchase)**: Some merchants manually adjust the price of the custom product in the draft order after the customer places the order. This is less ideal for a seamless customer experience.

**Recommendation**:
1.  Create a generic "Custom Shade Sail" product in Shopify with a single variant.
2.  When adding to cart, use this variant's ID and pass all configuration details as line item properties.
3.  For dynamic pricing, investigate Shopify Apps that allow price adjustments based on line item properties, or consider a custom app using the Draft Orders API if budget and complexity allow.

### 5. PDF Quote Generation (Supabase Edge Function)

The `generate-pdf` Supabase Edge Function is critical for reliable PDF generation.

*   **Deployment**: Deploy this function to your Supabase project. Ensure it's publicly accessible if called directly from the client, or secured if called from a backend service.
*   **Environment Variables**: If the function needs any API keys (e.g., for image optimization services if added later), configure them as Supabase secrets.
*   **CORS**: Ensure the function's CORS headers (`Access-Control-Allow-Origin`) are correctly configured to allow requests from your Shopify domain.
*   **Integration**: The client-side `generatePDF` function in `src/utils/pdfGenerator.ts` currently handles both client-side and server-side (via `fetch`) PDF generation. For production, you might want to exclusively use the Supabase Edge Function for PDF generation to ensure consistency and quality.

### 6. Deployment to Live Environment

*   **Build Process**: Use `npm run build` to compile the React application. This will create an optimized `dist` folder.
*   **Hosting**:
    *   **Shopify Assets**: Upload the contents of the `dist` folder (JS, CSS, HTML) to your Shopify theme's assets.
    *   **CDN**: For better performance, consider hosting the `dist` folder on a CDN (e.g., Cloudflare Pages, Netlify, Vercel) and embedding it into Shopify.
*   **Supabase**: Ensure your Supabase project (for the PDF generation Edge Function) is properly configured and deployed.

## Local Development

To run the project locally:

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd shadespace
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the development server**:
    ```bash
    npm run dev
    ```
    This will typically start the app at `http://localhost:5173`.

## Future Enhancements

*   **Dynamic Data Loading**: Implement fetching fabric and pricing data from Shopify Metafields or an external database.
*   **User Accounts**: Integrate with Shopify's customer accounts for saving configurations.
*   **Order Management**: Develop a system to manage custom orders generated by the configurator.
*   **Advanced Visualization**: Implement 3D visualization of the shade sail.
*   **Analytics**: Integrate analytics to track user behavior within the configurator.
*   **Testing**: Add unit and integration tests for critical components and logic.

## Technical Specification: Shade Sail Configurator Integration with Shopify (Current State & Future Plan)

**Version:** 2.0  
**Date:** January 2025  
**Status:** Production Ready Frontend + Future Shopify Integration Plan

### 1. Current Application State

The ShadeSpace Configurator is a fully functional React application that provides:

- **Complete Configuration Flow**: 7-step process from fabric selection to final review
- **Real-time Pricing**: Dynamic calculations based on measurements and selections
- **Interactive Visualization**: SVG-based shade sail preview with measurement tools
- **PDF Generation**: Both client-side (jsPDF) and server-side (Supabase Edge Function with Puppeteer)
- **Responsive Design**: Optimized for desktop and mobile devices
- **Production Deployment**: Currently hosted at https://shadespace.com

#### Current Architecture

```
Frontend (React + Vite)
├── Configuration State Management
├── Real-time Pricing Calculations
├── Interactive SVG Canvas
├── PDF Generation (Client + Server)
└── Responsive UI Components

Backend Services
└── Supabase Edge Function (PDF Generation)
```

#### Key Technical Components

1. **State Management**: Centralized in `src/ShadeConfigurator.tsx` using React useState
2. **Pricing Engine**: `src/hooks/useShadeCalculations.ts` with comprehensive pricing logic
3. **Validation System**: `src/utils/geometry.ts` with typo detection and measurement validation
4. **PDF Generation**: Dual approach with client-side fallback and server-side reliability
5. **Currency Support**: Multi-currency pricing with exchange rates and regional markups

#### Current Currency Implementation

**Note**: IP-based currency detection has been removed from the current implementation for code cleanliness. The application defaults to NZD currency.

**Supported Currencies**: NZD, USD, AUD, GBP, EUR, CAD (defined in `src/data/pricing.ts`)

For Shopify integration, currency detection should be handled via Shopify's built-in currency system rather than IP detection.

### 2. Shopify Integration Architecture (Future Implementation)

The integration will involve three main components:

1. **Shade Sail Configurator (Frontend)**: Current React application
2. **Custom Backend Service**: New intermediary service for Shopify API interaction
3. **Shopify Store**: E-commerce platform for order management

#### Integration Flow

```
User Configures Shade Sail
         ↓
Frontend Calculates Pricing
         ↓
User Clicks "Add to Cart"
         ↓
Frontend → Custom Backend Service
         ↓
Backend → Shopify Draft Orders API
         ↓
Shopify Returns Checkout URL
         ↓
User Redirected to Shopify Checkout
```

### 3. Frontend Integration Points

#### 3.1. Currency Handling (Recommended Approach)

**Current State**: Application defaults to NZD currency

**Shopify Integration Approach**:
- Remove `currency` from `ConfiguratorState` in `src/types/index.ts`
- Pass active currency from Shopify via Liquid template: `{{ cart.currency.iso_code }}`
- Modify `useShadeCalculations.ts` to accept currency as a prop
- Ensure all calculations use Shopify's base currency for consistency

#### 3.2. Add to Cart Implementation

**Location**: `src/components/steps/ReviewContent.tsx`

**Current State**: `handleAddToCart` shows placeholder alert

**Required Implementation**:
```typescript
const handleAddToCart = async () => {
  try {
    const response = await fetch('/api/create-draft-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, calculations })
    });
    
    const { checkout_url } = await response.json();
    window.location.href = checkout_url;
  } catch (error) {
    // Handle error appropriately
  }
};
```

#### 3.3. Configuration Data Structure

The complete configuration state includes:
- `fabricType`, `fabricColor`, `edgeType`
- `corners`, `unit`, `measurementOption`
- `measurements` (edges and diagonals)
- `fixingHeights`, `fixingTypes`, `eyeOrientations`
- Calculated values: `area`, `perimeter`, `totalPrice`

### 4. Custom Backend Service Specification

#### 4.1. Technology Stack
- **Recommended**: Node.js with Express or Python with FastAPI
- **Deployment**: AWS App Runner, Vercel, or similar container service
- **Authentication**: Shopify Admin API Access Token (environment variable)

#### 4.2. Core Endpoint: POST /api/create-draft-order

**Request Body**:
```json
{
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
    "eyeOrientations": ["horizontal", "vertical", "horizontal", "vertical"]
  },
  "calculations": {
    "area": 12.0,
    "perimeter": 14.0,
    "fabricCost": 1000.00,
    "edgeCost": 0,
    "hardwareCost": 300.00,
    "totalPrice": 1300.00,
    "webbingWidth": 50,
    "wireThickness": null
  }
}
```

**Processing Logic**:
1. Validate input data
2. Construct Shopify line item with detailed properties
3. Create Draft Order via Shopify Admin API
4. Return checkout URL to frontend

**Shopify Draft Order Payload**:
```json
{
  "draft_order": {
    "line_items": [{
      "title": "Custom Shade Sail - Monotec 370 - 4 Corners",
      "price": "1300.00",
      "quantity": 1,
      "properties": [
        { "name": "Fabric Type", "value": "Monotec 370" },
        { "name": "Fabric Color", "value": "Koonunga Green" },
        { "name": "Edge Type", "value": "Webbing Reinforced" },
        { "name": "Number of Corners", "value": "4" },
        { "name": "Edge A-B", "value": "3000mm" },
        { "name": "Diagonal A-C", "value": "5000mm" },
        { "name": "Corner A Height", "value": "2500mm" },
        { "name": "Corner A Type", "value": "Post" },
        { "name": "Total Area", "value": "12.00 m²" }
      ]
    }],
    "currency": "NZD",
    "note": "Generated by Shade Sail Configurator",
    "tags": "custom-configurator"
  }
}
```

### 5. Shopify Store Configuration

#### 5.1. Custom App Setup
1. **Create Custom App**: Shopify Admin → Apps → Develop apps
2. **Required Scopes**:
   - `write_draft_orders`
   - `read_draft_orders`
3. **Generate Admin API Access Token**

#### 5.2. Multi-Currency Setup
- Enable all supported currencies: NZD, USD, AUD, GBP, EUR, CAD
- Configure Shopify Payments for international transactions
- Set up currency conversion rates (or use Shopify's automatic rates)

### 6. Implementation Phases

#### Phase 1: Backend Service Development
- [ ] Create Custom Backend Service
- [ ] Implement Draft Orders API integration
- [ ] Set up authentication and security
- [ ] Deploy to production environment

#### Phase 2: Frontend Integration
- [ ] Update `handleAddToCart` function
- [ ] Implement error handling and loading states
- [ ] Remove hardcoded currency, integrate with Shopify currency
- [ ] Add order confirmation flow

#### Phase 3: Shopify Configuration
- [ ] Create and configure Custom App
- [ ] Set up multi-currency support
- [ ] Configure order fulfillment workflows
- [ ] Set up order notification systems

#### Phase 4: Testing & Optimization
- [ ] End-to-end testing across all currencies
- [ ] Load testing for high traffic scenarios
- [ ] User acceptance testing
- [ ] Performance optimization

### 7. Key Considerations

#### 7.1. Data Integrity
- All configuration details must be preserved in Shopify line item properties
- Pricing calculations must remain consistent between configurator and Shopify
- Measurement units and values must be clearly labeled

#### 7.2. Error Handling
- Network failures during Draft Order creation
- Shopify API rate limiting
- Invalid configuration data
- Currency conversion errors

#### 7.3. Security
- Shopify Admin API tokens must be stored securely
- Input validation on all user-provided data
- HTTPS enforcement for all API communications
- CORS configuration for cross-origin requests

#### 7.4. Performance
- Optimize Draft Order creation time
- Implement request caching where appropriate
- Monitor API response times
- Set up proper logging and monitoring

### 8. Testing Strategy

#### 8.1. Unit Testing
- Configuration state management
- Pricing calculation accuracy
- Data validation functions
- Currency conversion logic

#### 8.2. Integration Testing
- Frontend to Backend API calls
- Backend to Shopify API integration
- End-to-end configuration flow
- Multi-currency scenarios

#### 8.3. User Acceptance Testing
- Complete user journey testing
- Mobile device compatibility
- Cross-browser testing
- International user testing (different currencies/regions)

### 9. Monitoring & Analytics

#### 9.1. Key Metrics
- Configuration completion rates
- Add to cart conversion rates
- Draft Order creation success rates
- Average order values by currency
- User drop-off points in the flow

#### 9.2. Error Monitoring
- API failure rates and types
- Frontend JavaScript errors
- Shopify API response monitoring
- User experience issues

This technical specification provides a comprehensive roadmap for integrating the current ShadeSpace Configurator with Shopify's e-commerce platform while maintaining the high-quality user experience and robust functionality already achieved.