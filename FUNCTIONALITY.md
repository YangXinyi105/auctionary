# Core functionality update

The Vue frontend now uses the Auctionary singular `/item` endpoints and `/search`.
Legacy `/items` paths are supported by the same handlers for compatibility.

## User flows

- Register, sign in, and invalidate the server session on sign out.
- Browse, search, sort and paginate auctions on the server.
- Publish an auction; images are an optional API extension (required by the current upload form).
- View seller profile, bid history, current bid holder and auction result.
- Bid as a buyer; seller bids, expired auctions, invalid amounts and concurrent stale bids are rejected.
- Ask questions as a buyer; only the seller can create or update answers.
- My account: selling, bidding and archived lists, with pagination.
- Existing avatar and manually maintained collection-progress features remain available.
- Passwords are stored as scrypt hashes. Password changes require the current password and invalidate the session.
- LEGO categories can be attached to listings and used as a server-side search filter.
- Listing and question text passes through a basic English/Chinese profanity filter.
- Listing drafts can be saved, edited and deleted in browser local storage. Images are selected again before publishing.
- English and Chinese cover the principal pages, controls, loading states and client-side feedback.

## Data

`items`, `bids`, and `questions` are the canonical assignment tables. `item_images`
stores the additional photo URL. A one-time transaction copies legacy demo data,
preserving IDs where available and retaining the original tables. Startup waits
for initialization and migration. The pre-migration database backup is named
`backend/db.before-core-*.sqlite`; keep it private because it contains account data.

## Validation

Run `npm test` in `backend`. These are project-authored integration tests using an
independent in-memory database. They do not wipe the development database and are
not the university's official test suite. Run `npm run build` in the project root
to check the frontend production build.

## Remaining work

- Obtain and run the official university test suite; verify exact validation and response expectations.
- Record the required screencast and prepare the final submission package.

No grade or full official-test compatibility is claimed by this update.
