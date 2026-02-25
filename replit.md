# Station 44 Hub — Project Overview

A mobile-first React web app for SCDF Station 44, providing quick access to resources (roster, ambulance duty, training, admin), daily news, and a Protocols/SOP library.

## Architecture

- **Frontend**: React 18 + TypeScript, Tailwind CSS, Shadcn/UI, TanStack Query, wouter (routing), framer-motion
- **Backend**: Node.js + Express + multer (file uploads)
- **Storage**: JSON file-based (`shared/appData.json` static resources, `shared/newsData.json` news, `shared/libraryData.json` library items)
- **Uploads**: Files stored in `/uploads/` directory, served statically at `/uploads/<filename>`
- **Shared**: Zod schemas in `shared/schema.ts`, API routes in `shared/routes.ts`

## Key Features

### Admin Mode (Global)
- Secret 6-tap-in-4s gesture on the Important News card header triggers PIN modal
- PIN validated against `REPLIT_ADMIN_PIN` (falls back to `REPLIT_NEWS_ADMIN_PIN`)
- On success: `setAdminMode(pin)` saves to localStorage + sessionStorage; animated rainbow border appears on header
- "Exit Admin" button clears admin mode
- Admin state: `client/src/lib/adminMode.ts`

### Daily News System
- `ImportantNewsCard` on Home: collapsible, shows active news, unread badge
- `/news` page: active + expired items, per-device read tracking
- `/admin/news` page: PIN-guarded, post/edit/delete, pinned option, "Library Admin" link

### Protocols/SOP Library
- `/library` page: 3 bucket cards (SOP, Protocols, Others) with unread badges
- `/library/:bucket` page: item list with search (title/tag/version/summary), unread dots
- `/viewer/:id` page: in-app PDF iframe viewer (for uploaded PDFs)
- `/admin/library` page: add items (mass upload or URL), edit all metadata, delete

### Unread Badges
- `client/src/lib/readTracking.ts`: tracks read state in localStorage for both news and library
- Bell icon = total unread news + unread library items
- Library bucket cards show per-bucket unread count

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Home.tsx` | Main dashboard |
| `/news` | `NewsPage.tsx` | News listing |
| `/admin/news` | `AdminNewsPage.tsx` | News admin (PIN-guarded) |
| `/library` | `LibraryPage.tsx` | Library bucket selector |
| `/library/:bucket` | `LibraryBucketPage.tsx` | Items in a bucket |
| `/viewer/:id` | `ViewerPage.tsx` | In-app PDF viewer |
| `/admin/library` | `AdminLibraryPage.tsx` | Library admin (PIN-guarded) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/data` | Static app data |
| GET | `/api/news` | `{ active, expired }` news items |
| POST | `/api/news/verify-pin` | Validate admin PIN |
| POST | `/api/news` | Create news item (PIN in body) |
| PUT | `/api/news/:id` | Update news item (PIN in body) |
| DELETE | `/api/news/:id` | Delete news item (`x-admin-pin` header) |
| GET | `/api/library` | All library items (sorted by date) |
| POST | `/api/library` | Create library item (PIN in body) |
| PUT | `/api/library/:id` | Update library item metadata (PIN in body) |
| DELETE | `/api/library/:id` | Delete library item (`x-admin-pin` header) |
| POST | `/api/upload` | Upload files (multer, max 20, 50MB each; `x-admin-pin` header) |

## Environment Variables

- `REPLIT_ADMIN_PIN` — Unified admin PIN (preferred)
- `REPLIT_NEWS_ADMIN_PIN` — Legacy fallback PIN

## File Structure

```
client/src/
  components/
    ImportantNewsCard.tsx   # Collapsible news card + 6-tap admin gesture + unread badge
    layout/MobileLayout.tsx # Header (rainbow border, exit admin, bell badge), bottom nav
  lib/
    adminMode.ts            # localStorage admin mode state
    readTracking.ts         # localStorage read tracking for news + library
  pages/
    Home.tsx                # Main dashboard
    NewsPage.tsx            # Public news listing
    AdminNewsPage.tsx       # News admin management
    LibraryPage.tsx         # Library bucket selector
    LibraryBucketPage.tsx   # Items in a bucket + search
    ViewerPage.tsx          # In-app PDF viewer
    AdminLibraryPage.tsx    # Library admin (mass upload, edit metadata, delete)
shared/
  schema.ts                 # Zod types: NewsItem, LibraryItem, AppData
  appData.json              # Static resource data
  newsData.json             # Persisted news items
  libraryData.json          # Persisted library items
server/
  routes.ts                 # Express API routes (news + library + upload)
  storage.ts                # File-based storage interface
uploads/                    # Uploaded files (served at /uploads/<filename>)
```
