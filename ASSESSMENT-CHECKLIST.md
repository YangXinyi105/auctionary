# Assessment evidence and submission checklist

## Repeatable validation

- Root: `npm run build` checks the Vue production build.
- Backend: `npm test` runs isolated integration tests using an in-memory database.
- To run the university tests, start this backend with `PORT=3333`, `AUCTION_DB=:memory:` and `NODE_ENV=test`, then run `npm test` in the university starter directory. Restart the test backend before each run. Do not run database wipe scripts against the live database.
- `SEED_DEMO=false` disables demo seeding for a clean file-backed database as well.

## University suite caveats

The local supplied suite previously produced 120 passing / 8 failing tests. This is not proof of full API compliance or a predicted grade. Keep the supplied tests unchanged and ask the tutor to confirm these fixture inconsistencies:

- `good_item_data.json` creates item 1 with starting bid 4200, whereas the bid success assertions require amounts 3595 and 3596 to succeed. Rejection then affects bid history, item details and user/search bid lists.
- Search assertions expect six matches for `and` and one for `uv`; the supplied item names do not contain those matches. Confirm the intended search fields and obtain the matching fixture/test version.
- The supplied dates use milliseconds, whereas existing app data uses seconds. Clarify the API time-unit contract before changing stored dates or response formats.

## Five-minute demonstration plan

1. Register, sign in, show validation and sign out/session protection.
2. Publish a listing with categories and a custom duration; open its details.
3. Use another account to bid and ask a question; show history and seller reply.
4. Search, filter and paginate; show seller profile and account auction lists.
5. Show rejected offensive listing/question text. Save a draft with a photo, reload, edit and delete it.
6. Show mobile layout, loading/error feedback, and briefly show optional moderation features.

## Before submission

- Test 375px, 768px and desktop layouts plus keyboard navigation manually; record results rather than assuming CSS breakpoints prove usability.
- Include separate identifiable frontend/backend source directories and an approximately five-minute MP4 in one ZIP.
- Exclude node_modules, private database backups and personal credentials. Use a clean demonstration database.
- Verify installation and startup from the ZIP in a fresh directory.
- Check Moodle's 100 MB limit and verify the uploaded archive opens.
- Follow the course's AI-use and attribution requirements; retain third-party asset and component licences.
