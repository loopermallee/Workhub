# HQ Resources — Project Overview

A mobile-first React web app providing quick access to HQ resources including rosters, ambulance duty info, training schedules, and news announcements.

## Architecture

- **Frontend**: React 18 + TypeScript, Tailwind CSS, Shadcn/UI, TanStack Query, wouter (routing), framer-motion
- **Backend**: Node.js + Express
- **Storage**: JSON file-based (`shared/appData.json` for static resources, `shared/newsData.json` for news items)
- **Shared**: Zod schemas in `shared/schema.ts`, API routes in `shared/routes.ts`

## Key Features

### Resource Hub
- Category cards (Roster, Ambulance Duty, Training, Administrative)
- Bottom-drawer drill-down on mobile
- Real-time search across all items

### Daily News System
- `ImportantNewsCard` on Home page: collapsible, shows active news
- Secret 7-tap-in-4s gesture on the card triggers PIN modal
- Correct PIN → navigates to `/admin/news`
- `/news` page: active + expired items, per-device read tracking (localStorage)
- `/admin/news` page: PIN-guarded form to post/delete news items

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Home.tsx` | Main dashboard |
| `/news` | `NewsPage.tsx` | News listing (active + expired) |
| `/admin/news` | `AdminNewsPage.tsx` | PIN-guarded admin panel |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/data` | App data (categories, items, legacy news) |
| GET | `/api/news` | `{ active, expired }` news items |
| POST | `/api/news/verify-pin` | Validate admin PIN |
| POST | `/api/news` | Create news item (PIN required in body) |
| DELETE | `/api/news/:id` | Delete item (PIN in `x-admin-pin` header) |

## Environment Variables

- `REPLIT_NEWS_ADMIN_PIN` — Admin PIN for posting/managing news (set in Replit Secrets)

## File Structure

```
client/src/
  components/
    ImportantNewsCard.tsx   # Collapsible news card + secret admin tap
    NewsBanner.tsx          # Legacy (unused)
    ...
  pages/
    Home.tsx                # Main dashboard
    NewsPage.tsx            # Public news listing
    AdminNewsPage.tsx       # Admin news management
shared/
  schema.ts                 # Zod types for all data models
  appData.json              # Static resource data
  newsData.json             # Persisted news items
server/
  routes.ts                 # Express API routes
  storage.ts                # File-based storage interface
```
