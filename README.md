# Auctionary

Auctionary is a bilingual LEGO auction marketplace built for the Full-Stack Web Development assessment. The Vue frontend talks to an Express API backed by SQLite.

## Features

- Register, sign in and sign out with database-backed sessions
- Browse, search, sort and filter paginated auctions
- Publish a LEGO set with a photo, categories, custom “Other” theme, price and end date
- Save, edit and delete browser-local listing drafts
- View item details, current price, countdown and bid history; place validated bids
- Ask sellers questions and let sellers answer them
- Public user profiles plus private account, avatar upload and password change
- Personal LEGO collection-progress records
- English/Chinese interface switch
- Server-side validation, password hashing and configurable basic profanity filtering

## Requirements

- Node.js 22.18 or newer (or 24.12+)
- npm

## Run locally

Open two terminals from this folder.

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`. The API runs at `http://localhost:3334/`.

## Demo accounts

All demo accounts use the password `Pokemon123!`.

- `ash.test@example.com`
- `misty.test@example.com`
- `brock.test@example.com`

## Verification

```powershell
cd backend
npm test
```

```powershell
npm run build
```

The repository includes local backend tests. If the module provides a separate official marking test suite, run it according to the assessment instructions as an additional check.

## Data and files

- SQLite database: `backend/db.sqlite`
- Uploaded images: `backend/uploads/`
- Listing drafts: browser `localStorage` (photos are deliberately not stored in drafts)
- Third-party component attribution: `LICENSES/Uiverse-GooLoader.txt`

Do not publish real passwords or personal data in the submitted database. Demo passwords are for local assessment only.

## Submission checklist

- Run both verification commands and fix all failures.
- Demonstrate registration, login, publishing, bidding, questions, account settings and language switching in the video.
- Keep the source code, SQLite database and required attribution file.
- Exclude `node_modules`, build output, editor files and temporary backups from the final archive unless the brief explicitly requests them.
- Include the required MP4 demonstration and use the exact filename/submission structure stated in the assessment specification.
