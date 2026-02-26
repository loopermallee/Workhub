# Station 44 Hub

A mobile-first web app for users, providing quick access to resources (roster, ambulance duty, training, admin), daily news announcements, and a Protocols/SOP library.

---

## Admin Setup

### Setting the Admin PIN

1. Open the **Secrets** tab (padlock icon) in Replit.
2. Add a secret with key `REPLIT_ADMIN_PIN` and your chosen PIN.
3. Restart the app.

> **Note:** The old secret `REPLIT_NEWS_ADMIN_PIN` still works as a fallback if `REPLIT_ADMIN_PIN` is not set.

---

## Library — Protocols, SOPs & References

Accessible via the **Protocols/SOP** button in the bottom navigation.

### Browsing

Items are organised into 3 buckets:
- **SOPs** — Standard Operating Procedures
- **Protocols** — Clinical & operational protocols
- **Others** — Reference documents, contact lists, links

Tap a bucket to browse its documents. Use the search bar to filter by title, tag, version, or summary. Unread items show a red dot. Tap a PDF (uploaded file) to open it in the in-app viewer; other file types open in a new browser tab.


## Unread Badges

- **Bell icon** in the header: shows total unread count (news + library).
- **Important News card**: shows unread active news count.
- **Library bucket cards**: show per-bucket unread count.
- Read state is stored per-device in browser localStorage — it does not sync across devices.

---

## Theme

The app automatically switches between **light mode** (6am–7pm) and **dark mode** (7pm–6am).
