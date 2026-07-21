# Plan 012: User Dashboard / Welcome Landing Pad

## Affected Surfaces
- **Files**: `frontend/src/pages/Dashboard.jsx` [NEW], `frontend/src/App.jsx`
- **Components**: User Welcome Dashboard Screen (`/dashboard`)

## Design & Structure
- **Header**: User avatar badge, user full name, quick logout button.
- **Hero Welcome Banner**: Personalized greeting (*"Welcome back, [Name]"*), short product tagline, and high-impact CTA button: **"Launch AI Analyst Workspace"** (`/workspace`).
- **Quick Stats Bar**: 3 metrics cards (Active Sessions count, Uploaded Source Files count, Total Queries Analyzed).
- **Recent Sessions Grid**: Cards listing recent active sessions with timestamps and a click handler to jump straight into `/workspace?session_id=...`.

## Motion Specifications
- **Page Load Stagger**: Card grid enters with staggered fade-ups over 250ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Button Micro-Interactions**: `.btn-tactile` active scaling (`active:scale-[0.97]`).
