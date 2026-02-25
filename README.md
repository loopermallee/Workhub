# HQ Resources

A mobile-first web app for quick access to HQ resources, schedules, and announcements.

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

- Fill in a **Title** (required), optional **Body**, and an **Expiry date/time** (must be in the future).
- Tap **Publish** — the item will appear immediately in the Important News card and the `/news` page.
- Items past their expiry date move to the "Past" section on the News page and are shown with an "Expired" label.

### News Page

Visit `/news` to see:

- **Current** — all active (non-expired) news items.
- **Past** — expired items, shown in muted styling with an "Expired" badge.

Tapping an item marks it as read (stored per-device in the browser).
