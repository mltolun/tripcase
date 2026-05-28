# TripCase SPA Architecture

## Overview

TripCase is a fully client-side **single-page application (SPA)** for managing travel itineraries. It runs entirely in the browser — pages are rendered, routed, and updated on the client without full-page reloads.

**Stack:** React 18 + TypeScript, Vite 5, React Router v6, Tailwind CSS 3, Framer Motion, Supabase (backend + auth).

---

## How It Works

### 1. Single HTML Shell

The app starts from `index.html` — a minimal HTML file with a `<div id="root">` and a `<script type="module" src="/src/main.tsx">` tag. Vite bundles all JavaScript, CSS, and assets into this one entry point. Every route reuses the same HTML; only the JavaScript swaps the visible content.

### 2. Client-Side Routing

`main.tsx` renders `<BrowserRouter>` from React Router v6. This intercepts all navigation events (link clicks, programmatic navigation) and updates the URL in the address bar **without triggering a server request**. The router matches the current URL to a component tree and renders the corresponding page.

Key routes:

| Path | Component | Auth Required |
|---|---|---|
| `/` | LandingPage (anon) / DashboardPage (auth'd) | No / Yes |
| `/login` | LoginPage | No (redirects if logged in) |
| `/signup` | SignupPage | No (redirects if logged in) |
| `/trip/:id` | TripPage | Yes |
| `/share/:token` | SharePage | No (public) |

Navigation happens via React Router's `<Link>` and `useNavigate()`. The `<Navbar>` layout is rendered around app routes but excluded for auth and share pages.

GitHub Pages doesn't support SPA fallback natively, so `index.html` includes a small inline script that saves the current route to `sessionStorage` and restores it after a redirect.

### 3. Auth Flow

Authentication is managed by a React **context provider** (`AuthContext.tsx`) wrapping the entire app:

- On mount, it calls `supabase.auth.getSession()` and subscribes to `supabase.auth.onAuthStateChange()`.
- It exposes `user`, `session`, `loading`, `signIn`, `signUp`, and `signOut` via the `useAuth()` hook.
- Supabase persists the session automatically in `localStorage`, so a page refresh restores the session without re-login.

A `<ProtectedRoute>` wrapper in `App.tsx` checks `useAuth().user` — if loading, it shows a spinner; if unauthenticated, it redirects to `/login`; otherwise it renders children.

### 4. Data Flow

There is **no API server or REST layer**. The browser talks directly to Supabase (PostgREST) using the Supabase JS client:

```
Component → Custom Hook → supabase.from('trips').select(...) → PostgREST API → PostgreSQL
```

Each entity has a dedicated hook:

- `useTrips()` — fetch, create, update, delete trips
- `useFlights(tripId)` — CRUD flights scoped to a trip
- `useHotels(tripId)`, `useCarRentals(tripId)` — same pattern

Hooks hold local state with `useState`, fetch on mount via `useEffect`, and optimistically update state after mutations. There is no global store (no Redux, Zustand, etc.).

### 5. Serverless Functions

Supabase Edge Functions (Deno/TypeScript) handle server-side work the browser can't do alone:

- **`lookup-flight`** — scrapes external APIs (FlightView, FlightStats) to auto-populate flight details by flight number.
- **`check-flight-status`** — fetches real-time flight status and updates the database directly (using a service-role key).
- **`scheduled-flight-check`** — background periodic status checker.

These are invoked from the client via `supabase.functions.invoke('function-name', ...)`.

### 6. Security

Supabase **Row Level Security (RLS)** enforces data isolation at the database level. Even though the Supabase anon key is exposed to the browser, RLS policies ensure:

- Users can only read/write their own trips (via `user_id` matching `auth.uid()`).
- Public trips (with `is_public = true`) are readable by anyone via `share_token`.

### 7. UI Rendering

- **Pages** are laid out using React Router. Page transitions use Framer Motion (`AnimatePresence` + fade/slide variants).
- **Component hierarchy** is domain-organized: `trips/`, `flights/`, `hotels/`, `cars/`, `ui/`, `layout/`.
- **Forms** update local state and call hook CRUD methods on submit, which in turn call Supabase and refresh the local list.
- **Toasts** (`react-hot-toast`) provide success/error feedback after mutations.

### 8. Deployment

The app builds to a static `dist/` folder with `npm run build` and deploys to GitHub Pages. Since it's a true SPA, all routing is client-side and the server just serves `index.html` for all paths (handled by the `gh-pages` package and the sessionStorage redirect script).

---

## Architecture Diagram

```
Browser
  │
  ├── BrowserRouter (React Router)
  │     ├── Public Routes: /login, /signup, /share/:token
  │     └── App Routes (with Navbar)
  │           ├── / → LandingPage | DashboardPage
  │           └── /trip/:id → TripPage (protected)
  │
  ├── AuthProvider (Supabase auth context)
  │
  ├── Custom Hooks (data fetching + CRUD)
  │     └── Supabase JS Client
  │           ├── PostgreSQL (via PostgREST, RLS-enforced)
  │           └── Edge Functions (flight lookups)
  │
  └── Tailwind CSS + Framer Motion (styling + animation)
```
