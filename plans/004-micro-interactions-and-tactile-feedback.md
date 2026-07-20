# Plan 004: Micro-Interactions & Tactile Button Feedback

## Affected Surfaces
- **Files**: `frontend/src/components/Sidebar.jsx`, `frontend/src/components/ChatWindow.jsx`, `frontend/src/components/FileUploader.jsx`, `frontend/src/components/ChartRenderer.jsx`
- **Components**: "New Session" button, "Export PDF" button, Mic recording button, Send button, Prompt suggestion chips, Session item cards, Upload zone, Chart type switches, Palette buttons

## Current Behavior vs Proposed Behavior
- **Current**: Buttons have hover color transitions (`hover:bg-indigo-600`, `hover:bg-slate-200`) but offer no micro-compression or tactile feedback when clicked. Buttons feel passive and web-like rather than native desktop software.
- **Proposed**: Apply subtle spring compression (`active:scale-[0.97]`) and crisp scale hover curves (`hover:scale-[1.01]`) with `transition-transform duration-100 ease-out`.

## Motion Specifications
- **Easing Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (*fast snap out*)
- **Hover Duration**: `150ms` (`hover:scale-[1.01]` or `hover:scale-[1.02]`)
- **Active Click Duration**: `80ms` (`active:scale-[0.97]`)
- **CSS Utility Utility**:
  ```css
  .btn-tactile {
    @apply transition-all duration-150 active:scale-[0.97] hover:scale-[1.01];
  }
  ```

## Rationale & Experience Impact
Tactile click feedback is a hallmark of premium user interfaces (such as Apple iOS/macOS UI elements and Linear app buttons). Providing instantaneous scale feedback on press reduces perceived latency and gives users physical confidence that their action was registered.

## Accessibility Considerations
Scale changes are minimal (`0.97` to `1.01`) and will be disabled under `prefers-reduced-motion: reduce`.
