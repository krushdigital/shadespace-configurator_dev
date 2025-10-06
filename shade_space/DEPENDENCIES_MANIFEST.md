# ShadeSpace Configurator - Dependencies Manifest

This document provides a complete inventory of all dependencies for the ShadeSpace configurator. Your developer should match these versions in the production environment for seamless integration.

---

## Installation Command

```bash
cd shade_space
npm install
```

---

## Production Dependencies

These are required at runtime:

```json
{
  "@headlessui/react": "^2.2.9",
  "@types/node": "^24.2.1",
  "html2canvas": "^1.4.1",
  "jspdf": "^3.0.1",
  "lucide-react": "^0.344.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-toastify": "^11.0.5"
}
```

### Dependency Breakdown

#### @headlessui/react (^2.2.9)
- **Purpose**: Accessible, unstyled UI components
- **Used For**: Transitions, Dialog components
- **Critical**: Yes - Used in step transitions and modals
- **Size Impact**: ~50KB (gzipped)

#### @types/node (^24.2.1)
- **Purpose**: TypeScript type definitions for Node.js
- **Used For**: Type safety in utility functions
- **Critical**: Yes - Required for TypeScript compilation
- **Size Impact**: 0KB (dev-time only)

#### html2canvas (^1.4.1)
- **Purpose**: Convert DOM elements to canvas
- **Used For**: Client-side PDF generation
- **Critical**: Yes - Fallback PDF generation
- **Size Impact**: ~200KB (gzipped)
- **Alternative**: Server-side Supabase function

#### jspdf (^3.0.1)
- **Purpose**: PDF generation library
- **Used For**: Client-side PDF creation from canvas
- **Critical**: Yes - Primary PDF generation
- **Size Impact**: ~150KB (gzipped)
- **Works With**: html2canvas

#### lucide-react (^0.344.0)
- **Purpose**: Icon library
- **Used For**: UI icons throughout application
- **Critical**: Yes - Used extensively in UI
- **Size Impact**: ~30KB (tree-shaken)
- **Icons Used**: Check, X, Info, Download, ChevronDown, Eye, etc.

#### react (^18.3.1)
- **Purpose**: Core React library
- **Used For**: Component rendering and state management
- **Critical**: CRITICAL - Core framework
- **Size Impact**: ~130KB (gzipped)
- **Note**: Must be version 18+ for new features

#### react-dom (^18.3.1)
- **Purpose**: React DOM rendering
- **Used For**: Mounting React to DOM
- **Critical**: CRITICAL - Core framework
- **Size Impact**: Included with React
- **Note**: Must match React version

#### react-toastify (^11.0.5)
- **Purpose**: Toast notification system
- **Used For**: User feedback messages
- **Critical**: Yes - Used for validation messages
- **Size Impact**: ~20KB (gzipped)
- **Features**: Auto-dismiss, positioning, animations

---

## Development Dependencies

These are required for building and development:

```json
{
  "@eslint/js": "^9.9.1",
  "@types/react": "^18.3.5",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.3.1",
  "autoprefixer": "^10.4.18",
  "eslint": "^9.9.1",
  "eslint-plugin-react-hooks": "^5.1.0-rc.0",
  "eslint-plugin-react-refresh": "^0.4.11",
  "globals": "^15.9.0",
  "postcss": "^8.4.35",
  "tailwindcss": "^3.4.1",
  "terser": "^5.43.1",
  "typescript": "^5.5.3",
  "typescript-eslint": "^8.3.0",
  "vite": "^5.4.2"
}
```

### Build-Critical Dependencies

#### @types/react (^18.3.5)
- **Purpose**: React type definitions for TypeScript
- **Critical**: REQUIRED - TypeScript won't compile without it

#### @types/react-dom (^18.3.0)
- **Purpose**: React DOM type definitions
- **Critical**: REQUIRED - TypeScript won't compile without it

#### @vitejs/plugin-react (^4.3.1)
- **Purpose**: Vite plugin for React Fast Refresh
- **Critical**: REQUIRED - Enables React in Vite

#### autoprefixer (^10.4.18)
- **Purpose**: PostCSS plugin for CSS vendor prefixes
- **Critical**: REQUIRED - Ensures CSS compatibility
- **Works With**: Tailwind CSS

#### postcss (^8.4.35)
- **Purpose**: CSS transformation tool
- **Critical**: REQUIRED - Processes Tailwind CSS

#### tailwindcss (^3.4.1)
- **Purpose**: Utility-first CSS framework
- **Critical**: REQUIRED - All styling uses Tailwind
- **Note**: Custom configuration in `tailwind.config.js`

#### terser (^5.43.1)
- **Purpose**: JavaScript minification
- **Critical**: REQUIRED - Production build optimization
- **Configuration**: `vite.config.ts` (terserOptions)

#### typescript (^5.5.3)
- **Purpose**: TypeScript compiler
- **Critical**: REQUIRED - All code is TypeScript
- **Configuration**: `tsconfig.json`

#### vite (^5.4.2)
- **Purpose**: Build tool and dev server
- **Critical**: CRITICAL - Core build system
- **Configuration**: `vite.config.ts`

### Optional Dependencies (Linting)

These can be omitted in production builds:

- `eslint` (^9.9.1)
- `@eslint/js` (^9.9.1)
- `eslint-plugin-react-hooks` (^5.1.0-rc.0)
- `eslint-plugin-react-refresh` (^0.4.11)
- `typescript-eslint` (^8.3.0)
- `globals` (^15.9.0)

---

## Peer Dependencies

React and React DOM have peer dependencies on each other. Ensure versions match:

```
react@18.3.1 ←→ react-dom@18.3.1
```

---

## Security Audit

Current status (as of installation):

```
8 vulnerabilities (2 low, 4 moderate, 2 high)
```

### Recommendation

Run `npm audit fix` to address vulnerabilities before production deployment.

```bash
cd shade_space
npm audit fix
```

**Note**: Some vulnerabilities may be in development dependencies only and won't affect production builds.

---

## Bundle Size Analysis

After build, the production bundle sizes are:

- **JavaScript**: ~1.02 MB (minified) / ~312 KB (gzipped)
- **CSS**: ~37 KB (minified) / ~6.4 KB (gzipped)
- **HTML**: ~0.5 KB

### Large Dependencies

The JavaScript bundle is large due to:

1. **html2canvas** (~200KB) - DOM to canvas conversion
2. **jspdf** (~150KB) - PDF generation
3. **React + React DOM** (~130KB) - Core framework
4. **lucide-react** (~30KB) - Icon library
5. **Application code** (~500KB) - Business logic and components

### Optimization Suggestions

1. **Code Splitting**: Consider lazy-loading PDF generation libraries
2. **Server-Side PDF**: Use Supabase Edge Function exclusively (removes ~350KB)
3. **Icon Tree-Shaking**: Import only used icons from lucide-react
4. **Vite Config**: Already optimized for production

---

## Version Constraints

### Must Match Exactly

- React: `18.3.1` (critical features used)
- React DOM: `18.3.1` (must match React)
- TypeScript: `5.5.3` (uses TS 5.5 features)
- Vite: `5.4.2` (build config specific to this version)

### Can Use Compatible Versions

- Tailwind CSS: `^3.4.x`
- PostCSS: `^8.4.x`
- Autoprefixer: `^10.4.x`
- Terser: `^5.x`

### Flexible

- lucide-react: Any `^0.340.x+`
- @headlessui/react: Any `^2.x`
- react-toastify: Any `^11.x`

---

## Installation Verification

After installation, verify with:

```bash
npm list --depth=0
```

Expected output should match the dependencies listed above.

### Post-Installation Checks

1. ✅ No missing peer dependencies warnings
2. ✅ No version conflict warnings
3. ✅ All packages installed (325 total with sub-dependencies)
4. ✅ `node_modules/` directory created (~160MB)

---

## Developer Integration Checklist

When integrating into production Shopify app:

- [ ] Install dependencies in production environment
- [ ] Verify React version matches (18.3.1)
- [ ] Verify TypeScript version matches (5.5.3)
- [ ] Verify Vite version matches (5.4.2)
- [ ] Run `npm audit fix` for security
- [ ] Test build process (`npm run build`)
- [ ] Verify all imports resolve correctly
- [ ] Check bundle sizes are reasonable
- [ ] Test in production-like environment

---

## Dependency Update Policy

### When to Update

- **Security vulnerabilities**: Update immediately
- **Major framework versions**: Test thoroughly before updating
- **Minor versions**: Safe to update with testing
- **Patch versions**: Generally safe to update

### How to Update

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all minor/patch versions
npm update

# Update to latest (including major versions) - CAREFUL!
npm install package-name@latest
```

### Testing After Updates

1. Run TypeScript compiler: `npx tsc --noEmit`
2. Run build: `npm run build`
3. Test all configuration flows
4. Verify PDF generation works
5. Check bundle sizes haven't increased significantly

---

## Alternative Dependency Considerations

### PDF Generation

**Current**: html2canvas + jsPDF (client-side)
**Alternative**: Supabase Edge Function only (server-side)
**Trade-off**: Removes ~350KB from bundle, requires network call

### Icon Library

**Current**: lucide-react
**Alternative**: react-icons or heroicons
**Trade-off**: Similar sizes, different icon sets

### UI Components

**Current**: Custom components + @headlessui/react
**Alternative**: Radix UI, shadcn/ui
**Trade-off**: More features, larger bundle

### State Management

**Current**: useState in React
**Alternative**: Zustand, Redux Toolkit
**Trade-off**: Better state management, adds dependency

---

## Known Issues & Resolutions

### Issue: Browserslist Outdated

**Warning**: "caniuse-lite is outdated"

**Resolution**:
```bash
npx update-browserslist-db@latest
```

### Issue: Large Bundle Size Warning

**Warning**: "Some chunks are larger than 500 kB"

**Resolution**: Already configured for single bundle (intentional)
- Alternative: Enable code splitting in `vite.config.ts`

### Issue: Security Vulnerabilities

**Status**: 8 vulnerabilities detected

**Resolution**:
```bash
npm audit fix
# or
npm audit fix --force  # (may cause breaking changes)
```

---

## Support & Updates

### Where to Get Help

- **Vite**: https://vitejs.dev/
- **React**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **TypeScript**: https://www.typescriptlang.org/

### Package Documentation

- **html2canvas**: https://html2canvas.hertzen.com/
- **jsPDF**: https://github.com/parallax/jsPDF
- **lucide-react**: https://lucide.dev/
- **@headlessui/react**: https://headlessui.com/

---

**Last Updated**: October 2025
**Node Version**: 18.20+ / 20.10+ / 21.0+
**npm Version**: 9.0+ recommended
**Package Manager**: npm (lock file: package-lock.json)
