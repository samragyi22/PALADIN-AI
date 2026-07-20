# Plan 003: Full-App Reduced Motion & High-Contrast Focus Ring System

## Affected Surfaces
- **Files**: `frontend/src/index.css`
- **Components**: Global stylesheet, all buttons, inputs, interactive cards, and animated elements

## Current Behavior vs Proposed Behavior
- **Current**: 
  - Continuous CSS animations (`.glow-indigo`, `.shimmer`, voice recorder pulse effects) run indefinitely without respecting user OS reduced motion preferences (`prefers-reduced-motion`).
  - Interactive controls (inputs, buttons, session cards) use standard browser outlines or `focus:outline-none` without unified accessibility focus indicators.
- **Proposed**: 
  - Implement a dedicated `@media (prefers-reduced-motion: reduce)` block in `index.css` that disables continuous pulsing keyframes and replaces shimmer movement with a soft static background state.
  - Implement a global high-contrast `:focus-visible` utility system across light and dark modes (`ring-2 ring-electricIndigo ring-offset-2 dark:ring-offset-darkBg outline-none`).

## Specifications
- **Reduced Motion Rule**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    .shimmer {
      background: rgba(255, 255, 255, 0.05) !important;
      animation: none !important;
    }
    .glow-indigo {
      animation: none !important;
      filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5)) !important;
    }
  }
  ```
- **Focus Visible Specification**:
  ```css
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricIndigo focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBg transition-shadow;
  }
  ```

## Rationale & Experience Impact
Ensures full compliance with WCAG 2.1 AAA accessibility requirements for keyboard navigation and motion sensitivity. Users navigating with a keyboard receive crisp, unmistakable visual indicators of active focus targets.

## Accessibility Considerations
Directly addresses accessibility compliance for motion-sensitive users and keyboard navigators.
