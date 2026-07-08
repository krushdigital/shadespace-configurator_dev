import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Scope every generated rule to the configurator's mount roots so the bundle
// stylesheet (Tailwind Preflight + !important utilities + custom rules) cannot
// leak onto the surrounding Shopify theme. Roots get the `.ss-scope` class at
// runtime (see src/utils/appScope.ts); popups portal into a `.ss-scope` host.
const SCOPE = '.ss-scope';

// Selectors already scoped to an explicit mount root are left untouched.
const ALREADY_SCOPED = [
  '#SHADE_SPACE',
  '#CONFIGURATOR_ROOT',
  '#SHADESAIL_ROOT',
  '#MY_DESIGNS_ROOT',
  '.ss-scope',
];

// Document-level selectors map to the scope root itself rather than a descendant.
const ROOT_EQUIVALENTS = new Set(['html', ':root', ':host', 'body']);

function scopeSelector(selector) {
  const s = selector.trim();
  if (!s) return selector;
  if (ALREADY_SCOPED.some((token) => s.includes(token))) return s;
  if (ROOT_EQUIVALENTS.has(s)) return SCOPE;

  const stripped = s.replace(/^(html|body|:root|:host)\b[\s>+~]*/i, '');
  if (stripped !== s) {
    return stripped ? `${SCOPE} ${stripped}` : SCOPE;
  }
  return `${SCOPE} ${s}`;
}

function scopeToApp() {
  return {
    postcssPlugin: 'scope-to-app',
    OnceExit(root) {
      root.walkRules((rule) => {
        for (let parent = rule.parent; parent; parent = parent.parent) {
          if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return;
        }
        rule.selectors = rule.selectors.map(scopeSelector);
      });
    },
  };
}
scopeToApp.postcss = true;

export default {
  plugins: [tailwindcss(), autoprefixer(), scopeToApp()],
};
