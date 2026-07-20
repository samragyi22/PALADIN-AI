# Plan 002: Smooth Collapsible Panel Drawers

## Affected Surfaces
- **Files**: `frontend/src/components/Sidebar.jsx`, `frontend/src/components/ChartRenderer.jsx`, `frontend/src/App.jsx`
- **Components**: Left Sidebar Navigation, Right Analytics & Chart Drawer

## Current Behavior vs Proposed Behavior
- **Current**: Panel collapse/expand triggers rely on basic `transition-all duration-300` on width changes (`w-80` vs `w-16` on Sidebar, `w-[420px]` vs `w-0` on Chart Panel). Content children unmount or text truncates abruptly, causing layout jitter and content overflow snapping during resizing.
- **Proposed**: Upgrade transition handling with an Apple-inspired cubic bezier easing curve `cubic-bezier(0.2, 0.8, 0.2, 1)`, 300ms duration. Add fade transitions (`opacity-0` / `opacity-100`) to child header text, inventory items, and action controls to prevent content layout clipping while resizing.

## Motion Specifications
- **Easing Curve**: `cubic-bezier(0.2, 0.8, 0.2, 1)` (*emphasized decelerate / spring-like fluid easing*)
- **Duration**: `300ms`
- **Trigger**: Sidebar collapse button click, Analytics panel toggle click, or auto-open on chart generation
- **CSS Utility / Class Structure**:
  ```css
  .drawer-transition {
    transition: width 300ms cubic-bezier(0.2, 0.8, 0.2, 1), 
                opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  ```

## Rationale & Experience Impact
Collapsible panels are core to workspace productivity. Smooth, non-colliding drawer transitions give the impression of a high-performance desktop workstation (like Linear or Xcode). Fading child text before shrinking panel boundaries avoids visual text clipping.

## Accessibility Considerations
Respect `prefers-reduced-motion` by reducing animation duration to `1ms` for users who have requested reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  .drawer-transition {
    transition: none !important;
  }
}
```
