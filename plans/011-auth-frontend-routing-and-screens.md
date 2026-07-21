# Plan 011: Frontend Routing, AuthContext, Login & Signup Screens

## Affected Surfaces
- **Files**: `frontend/src/context/AuthContext.jsx` [NEW], `frontend/src/pages/Login.jsx` [NEW], `frontend/src/pages/Signup.jsx` [NEW], `frontend/src/components/ProtectedRoute.jsx` [NEW], `frontend/src/App.jsx`
- **Components**: Client Routing, Authentication Context, Login & Signup Views

## Specifications & Form States
- **Routing**: Integrate `react-router-dom` with routes: `/`, `/login`, `/signup`, `/dashboard`, `/workspace`.
- **AuthContext**: Manages `user`, `isAuthenticated`, `login(email, password)`, `signup(fullName, email, password)`, `logout()`, `authLoading`.
- **Form States**:
  - **Idle**: Clean input fields with `:focus-visible` ring.
  - **Submitting**: Spinner / shimmer button state (`isSubmitting=true`).
  - **Error Banner**: Soft rose alert banner (`bg-rose-500/10 border-rose-500/20 text-rose-400`) displaying exact backend error messages.
  - **Success**: Smooth redirect to `/dashboard` or query redirect parameter.

## Motion Specifications
- **Form Entry Animation**: `scale(0.98) -> scale(1)`, `opacity: 0 -> 1` over 200ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Error Shake**: 300ms subtle horizontal shake keyframe `translateX(-4px) -> translateX(4px) -> translateX(0)`.
- **Reduced Motion**: Disables shake and scale transitions under `prefers-reduced-motion: reduce`.
