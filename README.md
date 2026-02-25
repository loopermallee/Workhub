# Station 44 Hub

A mobile-first web app for quick access to Station 44 resources including rosters, ambulance duty info, training schedules, and news announcements.

## Daily News System

### Setting the Admin PIN

1. In your Replit project, open the **Secrets** tab (the padlock icon in the sidebar).
2. Add a secret with the key `REPLIT_NEWS_ADMIN_PIN` and set the value to your chosen PIN (e.g. `1234`).
3. Restart the app for the secret to take effect.

### Accessing the Admin Page

The admin entry point is deliberately hidden. To access it:

1. On the Home screen, tap the **Important News** card **7 times within 4 seconds**.
2. A PIN prompt will appear — enter the PIN you configured above.
3. On success, you will be taken to the Admin page where you can post and manage news items.

> Normal users will not see any admin hint. The 7-tap gesture is the only entry point.

### Posting News

On the Admin page (`/admin/news`):

- Fill in a **Title** (required), optional **Body**, and either an **Expiry date/time** or check **Pinned (no expiry)**.
- Pinned items stay active permanently and are marked with a pin icon.
- Tap **Publish** — the item will appear immediately in the Important News card and the `/news` page.
- Items past their expiry date move to the "Past" section on the News page and are shown with an "Expired" label.

### Editing News

On the Admin page, tap the **pencil icon** next to any news item to edit its title, body, expiry, or pinned status.

### News Page

Visit `/news` to see:

- **Current** — all active (non-expired and pinned) news items.
- **Past** — expired items, shown in muted styling with an "Expired" badge.

Tapping an item marks it as read (stored per-device in the browser).

## Theme

The app automatically switches between **light mode** (6am–7pm) and **dark mode** (7pm–6am) based on the current time.
