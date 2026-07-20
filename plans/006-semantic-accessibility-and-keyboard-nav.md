# Plan 006: Semantic Accessibility & Keyboard Navigation for Interactive Elements

## Affected Surfaces
- **Files**: `frontend/src/components/Sidebar.jsx`, `frontend/src/components/ChatWindow.jsx`, `frontend/src/components/FileUploader.jsx`
- **Components**: Conversation history item divs, Source inventory card divs, Drag & Drop upload container div, Suggestion pill buttons

## Current Behavior vs Proposed Behavior
- **Current**: Interactive elements like conversation history items (`Sidebar.jsx` line 122) and dropzone containers (`FileUploader.jsx` line 84) are `<div>` elements with `onClick` handlers. They cannot be tabbed to with a keyboard and lack ARIA attributes (`role="button"`, `tabIndex={0}`, `aria-label`).
- **Proposed**: Convert clickable container elements to native `<button>` elements or add proper ARIA attributes (`role="button"`, `tabIndex={0}`) along with `onKeyDown` handlers for `Enter` and `Space` key triggers. Add explicit `aria-label` strings to icon-only buttons.

## Implementation Specifications
- **Conversation Session Items**:
  ```jsx
  <div
    role="button"
    tabIndex={0}
    aria-label={`Switch to ${sessId}`}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchSession(sessId);
      }
    }}
    onClick={() => switchSession(sessId)}
    ...
  />
  ```
- **Icon Buttons**: Add `aria-label` attributes to theme toggle buttons, delete buttons, collapse chevron buttons, and mic recording triggers.

## Rationale & Experience Impact
Allows screen readers and keyboard-only users to navigate the full workspace without relying on mouse input. Meets WCAG 2.1 AA standards for keyboard operability.

## Accessibility Considerations
Directly fixes accessibility compliance gaps for screen reader users and keyboard navigation.
