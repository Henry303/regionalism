# Regionalism — Project Spec

## Overview
**Regionalism** is a full-stack interactive web app built on the **DeepSpace SDK** where users discover and pin regional English dialect words and phrases on a world map. New pins sync in real time across users without exposing any personal information about who submitted them.

## Tech Stack & Conventions
- **Framework:** DeepSpace SDK (Vite + React + TypeScript frontend, Cloudflare Worker backend). Follow all SDK patterns in `AGENTS.md`.
- **Auth & Data:** DeepSpace built-in authentication (`DeepSpaceAuthProvider`, `AuthGate`) and DeepSpace Collections (`src/schemas/` via `deepspace/schema`) with RBAC.
- **Map:** leaflet + react-leaflet using standard OpenStreetMap tiles ([https://tile.openstreetmap.org/](https://tile.openstreetmap.org/){z}/{x}/{y}.png) styled with a CSS grayscale/lightness filter on .leaflet-tile-pane so the map stays minimalist and #CC2F10 pins pop.
- **Styling:** Minimalist UI, Tailwind CSS, primary accent color `#CC2F10`.

## User Flow
1. **Authentication:** Unauthenticated users see a clean login / sign-up screen powered by DeepSpace Auth.
2. **First-Login Onboarding:** On first sign-in (if no `user_profiles` record exists), prompt the user to set their general location (`Town, State/Region, Country` — never a street address) and pick their approximate area on a mini-map. Coordinates are automatically rounded to **2 decimal places** (~1.1 km precision) before saving.
3. **Interactive World Map (Default View):**
   - Users pan and zoom across a minimalist light-colored map populated with `#CC2F10` pins.
   - Clicking a pin opens a card showing the **word/phrase**, **meaning**, and **region label** (never the author's username, email, or ID).
4. **Creating a Pin:**
   - A circular `+` button sits in the bottom-right corner of the map.
   - Clicking `+` opens a minimal modal requesting: **Word/Phrase** (required) and **Meaning** (required).
   - The pin automatically inherits its map coordinates (`lat`, `lng`, rounded to 2 decimal places) and `regionLabel` directly from the user's saved `user_profiles` location.
5. **List & Search:**
   - Users can browse a list of all posted pins and filter in real time by **word/phrase** or **region label**.
   - Clicking a pin in the list centers and highlights it on the map.
6. **Profile Tab:**
   - Displays the user's general location (editable, with coordinates re-rounded to 2 decimal places on update) and a list of **only their own pins**, with actions to edit or delete them.
   - Includes **Log Out** and **Delete Account** actions. Deleting an account **cascade deletes** all pins where `ownerId === currentUser.id`, deletes the user's `user_profiles` record, and signs the user out.

## Data Model (DeepSpace Collections)

### 1. `user_profiles` (Private — Owner-Only)
Extends DeepSpace Auth with general location info. Never queried by public map or list views.
- `id`: `string` (primary key, matches DeepSpace auth user ID)
- `homeRegion`: `string` (e.g., `"Berkeley, CA, USA"` — general town/state/country only)
- `homeLat`: `number` (rounded to 2 decimal places)
- `homeLng`: `number` (rounded to 2 decimal places)
- `createdAt`: `number` (timestamp)
- **RBAC:** `read`, `create`, `update`, `delete` restricted strictly to the owning user.

### 2. `pins` (Public Read, Owner Write/Delete)
Minimalist schema storing all dialect entries displayed on the map and searchable list.
- `id`: `string` (UUID)
- `ownerId`: `string` (matches auth user ID; used strictly for ownership checks, Profile filtering, and cascade deletion—never rendered in public UI)
- `word`: `string` (required, trimmed, max 60 chars)
- `meaning`: `string` (required, max 240 chars)
- `regionLabel`: `string` (copied from `user_profiles.homeRegion`)
- `lat`: `number` (copied from `user_profiles.homeLat`, rounded to 2 decimal places)
- `lng`: `number` (copied from `user_profiles.homeLng`, rounded to 2 decimal places)
- `createdAt`: `number` (timestamp)
- `updatedAt`: `number` (timestamp)
- **RBAC:** Any authenticated user can `read` and `create`; only the record's `ownerId` can `update` or `delete`.

## UI Design & Responsive Layout
- **Visual Style:** Minimalist light theme, neutral grays/whites, `#CC2F10` accent color for pins and primary actions.
- **Iconography:** Rounded square/box style for navigation and action icons; circular style exclusively for the floating `+` button.
- **Mobile (`< 768px`):**
  - Fixed bottom navigation bar with 3 icon tabs: **Map**, **List**, and **Profile**.
  - Touch-friendly button sizing (minimum `44x44px` tap targets).
- **Desktop (`>= 768px`):**
  - Compact top navigation bar with 2 tabs: **Map** and **Profile**.
  - On the **Map** tab, the searchable pin **List** renders as a persistent sidebar to the right of the map.

## Limitations & Explicit Non-Goals (Out of Scope for v1)
- **No specific street addresses:** Enforced via UI copy and rounding `lat`/`lng` to 2 decimal places on save.
- **English only:** No localization or multi-language switching.
- **No public user profiles or social features:** No usernames on pins, no comments, no friend lists, no direct messaging.
- **No audio pronunciations or external paid geocoding APIs:** Keep location selection lightweight (mini-map click + text label during onboarding) to avoid third-party API key dependencies.

## Phased Milestones
Implement strictly **one milestone per session**. Verify the build (`npm run build` / `npx deepspace dev start`) before moving on.

- **Milestone 1 — Schemas, Auth & Onboarding:**
  - Define `user_profiles` and `pins` DeepSpace collections with RBAC rules and seed 8–10 sample English regionalisms across different regions.
  - Wire up DeepSpace built-in auth (`AuthGate`) and the first-login onboarding modal to save `homeRegion`, `homeLat`, and `homeLng` (rounded to 2 decimal places).
- **Milestone 2 — Interactive Map & Pin Creation:**
  - Build the responsive app shell (mobile bottom bar: Map/List/Profile; desktop top bar: Map/Profile).
  - Integrate `react-leaflet` with standard OpenStreetMap tiles styled with a CSS grayscale/lightness filter and custom `#CC2F10` pin markers.
  - Implement the circular `+` button, minimal pin creation modal (`word` + `meaning` only, auto-populated with the user's saved location), and pin detail popup/card.
- **Milestone 3 — Searchable List & Profile Management:**
  - Build the searchable/filterable pin list (by word or region) rendered as the **List** tab on mobile and the right-hand sidebar on desktop, synced with map selection.
  - Build the **Profile** tab: edit general location, edit/delete user's own pins, Log Out, and Delete Account (cascade deleting all user pins and their profile record).
- **Milestone 4 — Polish, Edge Cases & Deploy:**
  - Add empty states, loading states, form validation, and mobile touch-target checks.
  - Verify privacy rules (no `ownerId` or profile info exposed on public pins) and deploy with `npx deepspace deploy`.