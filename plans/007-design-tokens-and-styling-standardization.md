# Plan 007: Design System Consistency & Token Standardization

## Affected Surfaces
- **Files**: `frontend/tailwind.config.js`, `frontend/src/index.css`
- **Components**: Global CSS utilities, component borders, background tokens, glass card definitions

## Current Behavior vs Proposed Behavior
- **Current**: Spacing, borders, and shadows are defined ad-hoc across components with varying opacities (`border-slate-200/50`, `border-slate-100/60`, `border-slate-800/80`, `bg-[#0E1526]/40` vs `bg-[#0E1526]/50`).
- **Proposed**: Tokenize glass colors, border opacities, card padding standards, and elevation shadows in `tailwind.config.js` and `index.css`. Standardize on consistent token classes (`glass-card`, `border-subtle`, `border-strong`, `bg-surface-dark`).

## Token Additions (`tailwind.config.js` & `index.css`)
```js
// Tailwind extension
extend: {
  colors: {
    surface: {
      light: '#FFFFFF',
      dark: '#0E1526',
      darker: '#0B0F19',
    },
    borderSubtle: {
      light: 'rgba(226, 232, 240, 0.6)',
      dark: 'rgba(30, 41, 59, 0.6)',
    }
  }
}
```

## Rationale & Experience Impact
Eliminates visual friction and inconsistency across light and dark modes. Ensures design tokens are maintained from a single source of truth.

## Accessibility Considerations
Improves contrast predictability across dark and light themes.
