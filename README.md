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

## Accessing Admin Mode

Admin mode is hidden — there is no visible admin button.

### Secret Gesture

1. On the Home screen, **tap the Important News card header 6 times within 4 seconds**.
2. A PIN prompt appears — enter your `REPLIT_ADMIN_PIN`.
3. On success, **admin mode activates**:
   - A **rainbow animated border** appears at the top of every screen.
   - An **"Exit Admin"** button appears in the header.
   - Admin mode persists across page navigation and app reloads (stored in browser localStorage).
   - You will be taken to the News Admin page.

### Exiting Admin Mode

Tap the **Exit Admin** button in the header at any time. Admin mode clears immediately.

---

## Daily News (Admin)

Navigate to `/admin/news` (or tap **Library Admin** → back to News from there):

- **Post**: Fill in Title (required), Body (optional), and set an Expiry date/time or toggle **Pinned (no expiry)**.
- **Edit**: Tap the pencil icon on any news item to update all fields.
- **Delete**: Tap the trash icon.
- **Pin**: Pinned items never expire and are shown with a pin icon.

---

## Library — Protocols, SOPs & References

Accessible via the **Protocols/SOP** button in the bottom navigation.

### Browsing

Items are organised into 3 buckets:
- **SOPs** — Standard Operating Procedures
- **Protocols** — Clinical & operational protocols
- **Others** — Reference documents, contact lists, links

Tap a bucket to browse its documents. Use the search bar to filter by title, tag, version, or summary. Unread items show a red dot. Tap a PDF (uploaded file) to open it in the in-app viewer; other file types open in a new browser tab.

### Library Admin (`/admin/library`)

Requires admin mode (or PIN re-entry). Access via the **Library Admin** button on the News Admin page.

#### Adding Documents

Two modes:
- **Upload Files**: Select one or multiple files at once (PDF, Word, Excel, PowerPoint). All selected files are uploaded in a single request. Each file auto-creates a library item using the filename as title (you can edit metadata after). Set shared metadata (bucket, version, date, tags, summary) for the batch.
- **URL**: Enter a direct URL with full metadata.

#### Editing Metadata

Tap the **pencil icon** on any item to edit all metadata fields:
- Title, Bucket, File Type, URL
- Version number, Last Updated date
- Tags (comma-separated), Summary

#### Deleting

Tap the **trash icon**. Uploaded files are deleted from the server's `/uploads` folder. URL-based items just remove the record.

---

## Uploads Folder

Files uploaded via the Library Admin are stored in the `/uploads` directory on the server filesystem. They are served at `/uploads/<filename>` and can be viewed in the in-app PDF viewer.

---

## Unread Badges

- **Bell icon** in the header: shows total unread count (news + library).
- **Important News card**: shows unread active news count.
- **Library bucket cards**: show per-bucket unread count.
- Read state is stored per-device in browser localStorage — it does not sync across devices.

---

## Theme

The app automatically switches between **light mode** (6am–7pm) and **dark mode** (7pm–6am).
