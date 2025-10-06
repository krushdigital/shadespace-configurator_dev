# ShadeSpace Configurator - Front-End Development Repository

This repository contains the **React-based shade sail configurator** for front-end development and testing purposes only.

## Purpose

This environment is used for making front-end changes to the ShadeSpace configurator. Once changes are complete, they will be synced to a development repository where a developer will integrate them into the live production Shopify app.

## Project Structure

```
shade_space/          # Main React application
├── src/              # Source code
│   ├── components/   # React components
│   ├── data/         # Fabric and pricing data
│   ├── hooks/        # Custom React hooks
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions
├── supabase/         # Supabase Edge Functions
└── package.json      # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js (v18.20 or higher)
- npm or yarn

### Installation & Development

1. **Navigate to the shade_space directory:**
   ```bash
   cd shade_space
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The application will typically start at `http://localhost:5173`

4. **Build for production:**
   ```bash
   npm run build
   ```

## Technology Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React useState hooks
- **PDF Generation:** jsPDF + html2canvas (client-side) and Supabase Edge Function with Puppeteer (server-side)
- **Backend Services:** Supabase Edge Functions
- **Icons:** Lucide React

## Key Features

- Multi-step configuration workflow
- Real-time pricing calculations
- Interactive SVG-based visualization
- Measurement validation with typo detection
- Multi-currency support
- PDF quote generation
- Responsive design

## Environment Variables

The application uses Supabase for backend services. Environment variables are configured in `shade_space/.env`:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Development Workflow

1. Make your front-end changes in the `shade_space` directory
2. Test locally using `npm run dev`
3. Build and verify with `npm run build`
4. Push changes to the development repository
5. Developer integrates changes into the production Shopify app

## Documentation

For detailed technical documentation, see `shade_space/README.md`

## Important Notes

- This repository contains **only the front-end React application**
- All Shopify-specific infrastructure has been removed
- The application runs independently without Shopify app context
- Changes made here will be integrated into the production Shopify app by the development team

## Support

For questions or issues with the configurator, contact the development team.
