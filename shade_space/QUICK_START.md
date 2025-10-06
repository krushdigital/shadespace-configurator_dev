# ShadeSpace Configurator - Quick Start Guide

This guide helps you quickly get started with front-end development on the ShadeSpace configurator.

---

## 🚀 Getting Started (First Time)

### 1. Verify Your Setup

You're already in the right place! This environment is ready for development.

**Current location**: `/shade_space` directory in your project

### 2. Start Development

The development server should start automatically when you work on this project. If you need to start it manually:

```bash
npm run dev
```

**Access the app**: The dev server URL will be displayed (typically http://localhost:5173)

### 3. Make Your Changes

Edit any files in the `src/` directory. Changes will appear instantly (hot reload).

---

## 📁 Key Files You'll Edit

### Most Common Edits

| What You Want to Change | File to Edit |
|------------------------|--------------|
| **Colors, spacing, fonts** | `src/index.css` + Tailwind classes in components |
| **Step 1: Fabric selection** | `src/components/steps/FabricSelectionContent.tsx` |
| **Step 2: Edge type** | `src/components/steps/EdgeTypeContent.tsx` |
| **Step 3: Corners** | `src/components/steps/CornersContent.tsx` |
| **Step 4: Measurements** | `src/components/steps/CombinedMeasurementContent.tsx` |
| **Step 5: Dimensions** | `src/components/steps/DimensionsContent.tsx` |
| **Step 6: Heights** | `src/components/steps/FixingPointsContent.tsx` |
| **Step 7: Review** | `src/components/steps/ReviewContent.tsx` |
| **Buttons, inputs, cards** | `src/components/ui/*.tsx` |
| **Fabric types & colors** | `src/data/fabrics.ts` |
| **Pricing** | `src/data/pricing.ts` |

### Files You Should NOT Edit

⚠️ **Avoid changing these** (integration-critical):

- `src/types/index.ts` - Type definitions
- `vite.config.ts` - Build configuration
- `package.json` - Dependencies (unless adding new ones)
- `tsconfig.json` - TypeScript settings

---

## 🎨 Common Tasks

### Adding a New Fabric Color

1. Open `src/data/fabrics.ts`
2. Find the fabric type (e.g., `monotec370`)
3. Add new color to the `colors` array:

```typescript
{
  name: 'Your Color Name',
  imageUrl: 'https://cdn.shopify.com/.../color-image.webp',
  textColor: '#FFFFFF', // or '#000000' for light colors
  shadeFactor: 85 // percentage (0-100)
}
```

### Changing Button Colors

Edit the Button component: `src/components/ui/Button.tsx`

Or use Tailwind classes directly in components:

```tsx
<button className="bg-blue-500 hover:bg-blue-600 text-white">
  Click Me
</button>
```

### Adjusting Spacing/Layout

Use Tailwind utility classes in the component:

```tsx
<div className="p-4 mb-6 space-y-3">  {/* padding, margin, spacing */}
  <h2 className="text-2xl font-bold">Title</h2>
</div>
```

### Adding Validation Messages

In step components, update validation logic:

```typescript
if (someCondition) {
  toast.error('Your validation message here');
  return;
}
```

### Changing Step Order or Labels

Edit `src/ShadeConfigurator.tsx` - look for the steps array/configuration.

---

## 🧪 Testing Your Changes

### Manual Testing

1. **Start dev server**: Changes appear immediately
2. **Test the full flow**: Go through all 7 steps
3. **Try different configurations**:
   - Different fabric types
   - Different corner counts (3, 4, 5, 6)
   - Different units (metric/imperial)
   - Different currencies

### Before Committing Changes

Run these commands:

```bash
# Build to check for errors
npm run build

# Check TypeScript types
npx tsc --noEmit

# (Optional) Run linter
npm run lint
```

**Expected result**: No errors ✅

---

## 📦 Building for Production

When you're ready to create a production build:

```bash
npm run build
```

**Output location**: `../public/shadespace/`

**Output files**:
- `bundle.js` - All JavaScript
- `bundle.css` - All styles
- `index.html` - Entry point

**What happens next**: Your developer will take these files and integrate them into the Shopify app.

---

## 🔄 Syncing with Developer

### Your Workflow

1. Make changes in this environment
2. Test thoroughly
3. Build successfully (`npm run build`)
4. Commit to shared Git repository
5. Notify developer

### What Your Developer Does

1. Pulls from Git repository
2. Extracts shade_space folder
3. Integrates into Shopify app
4. Deploys to production

---

## 🆘 Common Issues & Solutions

### Issue: "Module not found"

**Cause**: Import path is wrong
**Solution**: Check the file path is correct and uses relative imports

```typescript
// ✅ Good
import { Button } from '../ui/Button';

// ❌ Bad
import { Button } from 'components/ui/Button';
```

### Issue: "Type error" in TypeScript

**Cause**: Type mismatch
**Solution**: Check the type definition in `src/types/index.ts`

```typescript
// Make sure your data matches the type
const config: ConfiguratorState = {
  // ... all required properties
};
```

### Issue: Changes not appearing

**Cause**: Dev server not running or cached
**Solution**:
1. Restart dev server
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Build fails

**Cause**: TypeScript errors or missing dependencies
**Solution**:
1. Check error message
2. Fix TypeScript errors
3. Run `npm install` if dependencies are missing

---

## 💡 Tips & Best Practices

### 1. Use Existing Components

Don't create new UI components if existing ones work:
- `Button`, `Card`, `Input`, `Tooltip` already exist in `src/components/ui/`

### 2. Keep Styling Consistent

Use the same Tailwind colors and spacing throughout:
- Primary color: `bg-lime-400` (ShadeSpace green)
- Text: `text-gray-900` (dark) and `text-gray-600` (light)
- Spacing: Multiples of 4 (4, 8, 12, 16, 20, 24...)

### 3. Test on Mobile

The configurator should work on mobile devices. Test responsive design:
- Use browser DevTools (F12 → Toggle device toolbar)
- Test at 375px width (iPhone SE size)

### 4. Follow TypeScript

Don't use `any` types. Let TypeScript help you:

```typescript
// ✅ Good
const value: number = 100;

// ❌ Bad
const value: any = 100;
```

### 5. Keep It Simple

The simpler your changes, the easier for your developer to integrate.

---

## 📚 Need More Details?

- **Full documentation**: See `FRONTEND_DEVELOPMENT_GUIDE.md`
- **Dependencies**: See `DEPENDENCIES_MANIFEST.md`
- **Project README**: See `README.md`

---

## 🎯 Quick Reference

### File Structure
```
shade_space/
├── src/
│   ├── components/     # React components
│   ├── data/          # Fabrics, pricing
│   ├── hooks/         # Custom hooks
│   ├── types/         # TypeScript types
│   └── utils/         # Helper functions
├── supabase/          # Edge Functions
└── public/            # Static assets
```

### Commands
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Check code quality
```

### Key Concepts
- **State**: Managed in `ShadeConfigurator.tsx`
- **Types**: Defined in `src/types/index.ts`
- **Data**: Fabric/pricing in `src/data/*.ts`
- **Styling**: Tailwind CSS classes
- **Icons**: From `lucide-react`

---

## ✅ Pre-Commit Checklist

Before committing your changes:

- [ ] Code runs without errors
- [ ] Build completes successfully (`npm run build`)
- [ ] All 7 steps tested manually
- [ ] Responsive design checked (mobile + desktop)
- [ ] No console errors in browser
- [ ] Git commit message is descriptive
- [ ] No API keys or sensitive data in code

---

## 🚀 Ready to Start!

You're all set! Your development environment is fully configured and ready.

**Start making changes** to any file in `src/` and see them appear instantly.

**Happy coding!** 🎉

---

**Questions?** Check the full documentation in `FRONTEND_DEVELOPMENT_GUIDE.md` or ask your developer for clarification on integration-specific concerns.
