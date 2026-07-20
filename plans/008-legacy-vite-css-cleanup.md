# Plan 008: Legacy Vite Boilerplate CSS Cleanup

## Affected Surfaces
- **Files**: `frontend/src/App.css`
- **Components**: Global legacy styles (`.counter`, `.hero`, `#center`, `#next-steps`, `#docs`, `#spacer`, `.ticks`)

## Current Behavior vs Proposed Behavior
- **Current**: `App.css` contains ~185 lines of unused default CSS rules left over from initial Vite project setup (`.hero`, `#center`, `#next-steps`, `.ticks`, `#spacer`, etc.). None of these class or ID selectors are referenced in any current JSX component.
- **Proposed**: Safely purge all unused Vite boilerplate styles from `App.css`, leaving only a clean, minimal file or combining necessary app-level overrides into `index.css`.

## Rationale & Experience Impact
Reduces stylesheet size, avoids global selector pollution, and improves CSS maintainability.

## Accessibility Considerations
No functional or visual impact on accessibility; purely clean codebase maintenance.
