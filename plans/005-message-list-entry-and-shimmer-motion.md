# Plan 005: Message List Entry & Shimmer Loading Motion Polish

## Affected Surfaces
- **Files**: `frontend/src/components/ChatWindow.jsx`, `frontend/src/index.css`
- **Components**: User message bubbles, Assistant response cards, Processing state machine loader

## Current Behavior vs Proposed Behavior
- **Current**: 
  - Messages appear instantly in the chat window, snapping into DOM position without motion.
  - Shimmer loading animation (`.shimmer`) uses a fast linear 1.5s scroll that feels harsh and unpolished.
- **Proposed**: 
  - Wrap newly added message bubbles in a subtle slide-up entry keyframe (`translateY(10px)` to `translateY(0px)`, `opacity: 0` to `1`).
  - Refine the shimmer animation keyframe in `index.css` to use a smoother 2.2s ease-in-out movement with a softer gradient stop.

## Motion Specifications
- **Message Entry Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (*easeOutCubic*)
- **Message Entry Duration**: `250ms`
- **Shimmer Easing**: `cubic-bezier(0.4, 0, 0.6, 1)` (*ease-in-out*)
- **Shimmer Duration**: `2.2s` continuous loop
- **Keyframe Specification**:
  ```css
  @keyframes messageSlideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-message-entry {
    animation: messageSlideUp 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  ```

## Rationale & Experience Impact
Subtle entry motion guides the user's focus naturally as AI answers stream into the workspace. Replacing abrupt snap-ins with fluid slide-ups creates a dynamic, conversational flow.

## Accessibility Considerations
- `animate-message-entry` will revert to simple instant fade when `prefers-reduced-motion: reduce` is active.
