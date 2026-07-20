# Plan 001: Fix Missing `animate-fade-in` Utility Class

## Affected Surfaces
- **Files**: `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/src/components/ChatWindow.jsx`, `frontend/src/components/Sidebar.jsx`
- **Components**: Popover Upload Menu, Auto-Complete Query Suggestion Dropdown, "Show Analytics" Button

## Current Behavior vs Proposed Behavior
- **Current**: Components using the class `animate-fade-in` (e.g. `ChatWindow.jsx` lines 256, 383) snap into the DOM instantly without any animation because standard Tailwind CSS does not include a `fade-in` keyframe out of the box (Tailwind default animation utilities only include `spin`, `ping`, `pulse`, and `bounce`).
- **Proposed**: Fix this as a bug fix by defining custom keyframes and utility rules in `index.css` and `tailwind.config.js`. When triggered, popover menus and floating buttons will scale smoothly from `scale(0.96)` to `scale(1)` while transitioning opacity from `0` to `1`.

## Motion Specifications
- **Easing Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (*easeOutCubic* / Apple fluid transition)
- **Duration**: `200ms`
- **Trigger**: Mounted popover menu, dynamic suggestion box, and inline action buttons
- **Keyframe Specification**:
  ```css
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  .animate-fade-in {
    animation: fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  ```

## Rationale & Experience Impact
This bug fix restores intended visual elegance. Floating UI menus and popovers currently pop in jarringly, breaking visual continuity. Adding this fluid ease-out opacity/scale transition gives menus an organic, elevated feel like native macOS/iOS popovers.

## Accessibility Considerations
Include `@media (prefers-reduced-motion: reduce)` override so that users with motion sensitivity experience instantaneous opacity switching without scale/translate motion:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in {
    animation: fadeInStatic 100ms ease-out forwards;
  }
}
```
