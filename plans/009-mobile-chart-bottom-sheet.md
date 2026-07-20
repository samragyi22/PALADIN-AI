# Plan 009: Mobile Chart Panel Responsive Bottom-Sheet Transition

## Affected Surfaces
- **Files**: `frontend/src/components/ChartRenderer.jsx`, `frontend/src/App.jsx`, `frontend/src/index.css`
- **Components**: Analytics & Chart Renderer Drawer, Workspace Layout

## Current Behavior vs Proposed Behavior
- **Current**: On screen widths under 1024px (mobile/tablet viewports), the Analytics panel renders as a right-side column drawer (`w-[420px]`). This squeezes the central chat window and causes awkward horizontal overflow on narrow screens.
- **Proposed**: 
  - **Desktop (`lg:` breakpoint, `>= 1024px`)**: Preserve the existing right-hand side-by-side drawer layout (`w-[420px]`).
  - **Mobile (`< 1024px`)**: Transform the chart renderer into a floating modal bottom-sheet.
  - When hidden/collapsed, the sheet translates down off-screen (`translate-y-full opacity-0 pointer-events-none`).
  - When open/triggered, the sheet slides up smoothly from the bottom edge (`translate-y-0 opacity-100`) occupying ~85vh height with a semi-transparent backdrop blur (`bg-slate-950/60 backdrop-blur-sm`), rounded top corners (`rounded-t-3xl`), and a mobile grab handle indicator.

## Motion Specifications
- **Easing Curve**: `cubic-bezier(0.2, 0.8, 0.2, 1)` (matching Plan 002 decelerated fluid drawer curve)
- **Duration**: `350ms` slide duration, `250ms` backdrop opacity fade
- **Trigger**: Click "Show Analytics" button, auto-open on query chart output, or click mobile grab handle / close button to dismiss.
- **CSS Utility Specification**:
  ```css
  .bottom-sheet-transition {
    transition: transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1),
                opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  ```

## Rationale & Experience Impact
Mobile devices lack horizontal width for 3 side-by-side workspace columns. A bottom-sheet modal provides native mobile ergonomics (similar to iOS Apple Maps or financial analytical sheets) while keeping the chat background visible through glassmorphism backdrop blur.

## Accessibility Considerations
- **Escape Key & Outside Tap**: Tapping backdrop overlay or pressing `Escape` closes the bottom sheet.
- **`prefers-reduced-motion`**: Disables `translateY` sliding movement in favor of a static 150ms backdrop fade.
- **Focus Trap & Semantics**: Sets `role="dialog"` and `aria-modal="true"` on mobile sheet display.
