// Independent in-memory database: never clears or changes the user's development data.
process.env.AUCTION_DB = ':memory:';
const assert = require('assert/strict');
const { app, ready } = require('../server');
const { run } = require('../app/models/auction.store');
const db = require('../database');
let server, base, seller, buyer, itemId, questionId;
async function request(method, path, body, token) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Authorization': token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data, total: response.headers.get('x-total-count') };
}
describe('Core Auctionary flows (isolated database)', () => {
    before(async () => { await ready; await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); }); base = `http://127.0.0.1:${server.address().port}`; });
    after(async () => { await new Promise(resolve => server.close(resolve)); await new Promise(resolve => db.close(resolve)); });
    it('registers users, rejects duplicates and validates login', async () => {
        for (const name of ['seller', 'buyer']) {
            const body = { first_name: name, last_name: 'Test', email: `${name}@example.com`, password: 'Example123!' };
            assert.equal((await request('POST', '/users', body)).status, 201);
            assert.equal((await request('POST', '/users', body)).status, 400);
        }
        assert.equal((await request('POST', '/login', { email: 'seller@example.com', password: 'wrong' })).status, 400);
        seller = (await request('POST', '/login', { email: 'seller@example.com', password: 'Example123!' })).data;
        buyer = (await request('POST', '/login', { email: 'buyer@example.com', password: 'Example123!' })).data;
        assert.ok(seller.session_token); assert.ok(buyer.session_token);
        assert.equal((await request('PUT', '/users/avatar', { avatar_url: '/uploads/lego-10698.jpg' }, seller.session_token)).status, 200);
        assert.equal((await request('GET', '/users/me', undefined, seller.session_token)).data.avatar_url, '/uploads/lego-10698.jpg');
    });
    it('creates an auction without requiring an image; rejects invalid or past values', async () => {
        const item = { name: 'LEGO Test Set', description: 'Complete box', starting_bid: 10, end_date: Math.floor(Date.now()/1000) + 3600 };
        assert.equal((await request('POST', '/item', item)).status, 401);
        assert.equal((await request('POST', '/item', { ...item, end_date: 1 }, seller.session_token)).status, 400);
        assert.equal((await request('POST', '/item', { ...item, starting_bid: 1.5 }, seller.session_token)).status, 400);
        const result = await request('POST', '/item', item, seller.session_token);
        assert.equal(result.status, 201); itemId = result.data.item_id;
        const detail = await request('GET', `/item/${itemId}`);
        assert.equal(detail.data.creator_id, seller.user_id); assert.equal(detail.data.current_bid_holder, null);
    });
    it('supports categories and rejects offensive listing content', async () => {
        const categories = (await request('GET', '/categories')).data;
        assert.ok(categories.length >= 5);
        const baseItem = { description: 'Complete set', starting_bid: 10, end_date: Math.floor(Date.now()/1000) + 3600 };
        assert.equal((await request('POST', '/item', { ...baseItem, name: 'shit set' }, seller.session_token)).status, 400);
        const created = await request('POST', '/item', { ...baseItem, name: 'Categorised set', category_ids: [categories[0].category_id] }, seller.session_token);
        assert.equal(created.status, 201);
        assert.equal((await request('GET', `/item/${created.data.item_id}`)).data.categories.length, 1);
        assert.ok((await request('GET', `/search?category_id=${categories[0].category_id}`)).data.some(item => item.item_id === created.data.item_id));
        const custom = await request('POST', '/item', { ...baseItem, name: 'Custom theme set', custom_category: 'Architecture' }, seller.session_token);
        assert.equal(custom.status, 201);
        const detail = await request('GET', `/item/${custom.data.item_id}`);
        assert.ok(detail.data.categories.some(category => category.name === 'Architecture'));
        assert.ok((await request('GET', '/categories')).data.some(category => category.name === 'Architecture'));
    });
    it('enforces seller restrictions and atomically rejects duplicate concurrent bids', async () => {
        assert.equal((await request('POST', `/item/${itemId}/bid`, { amount: 11 }, seller.session_token)).status, 403);
        assert.equal((await request('POST', `/item/${itemId}/bid`, { amount: 10 }, buyer.session_token)).status, 400);
        assert.equal((await request('POST', `/item/${itemId}/bid`, { amount: '11' }, buyer.session_token)).status, 400);
        const bids = await Promise.all([request('POST', `/item/${itemId}/bid`, { amount: 20 }, buyer.session_token), request('POST', `/item/${itemId}/bid`, { amount: 20 }, buyer.session_token)]);
        assert.deepEqual(bids.map(r => r.status).sort(), [201, 400]);
        assert.equal((await request('GET', `/item/${itemId}/bid`)).data.length, 1);
        assert.equal((await request('GET', `/item/${itemId}`)).data.current_bid_holder.user_id, buyer.user_id);
    });
    it('supports buyer questions and seller-only answers', async () => {
        assert.equal((await request('POST', `/item/${itemId}/question`, { question_text: 'Box included?' }, seller.session_token)).status, 403);
        assert.equal((await request('POST', `/item/${itemId}/question`, { question_text: ' ' }, buyer.session_token)).status, 400);
        assert.equal((await request('POST', `/item/${itemId}/question`, { question_text: 'Box included?' }, buyer.session_token)).status, 200);
        questionId = (await request('GET', `/item/${itemId}/question`)).data[0].question_id;
        assert.equal((await request('POST', `/question/${questionId}`, { answer_text: 'Yes' }, buyer.session_token)).status, 403);
        assert.equal((await request('POST', `/question/${questionId}`, { answer_text: 'Yes' }, seller.session_token)).status, 200);
        assert.equal((await request('GET', `/item/${itemId}/question`)).data[0].answer_text, 'Yes');
    });
    it('allows administrators to delete questions and mute or unmute users', async () => {
        await request('POST', '/users', { first_name: 'Observer', last_name: 'Test', email: 'observer@example.com', password: 'Example123!' });
        const observer = (await request('POST', '/login', { email: 'observer@example.com', password: 'Example123!' })).data;
        await run('UPDATE users SET is_admin=1 WHERE user_id=?', [buyer.user_id]);
        assert.equal((await request('PUT', `/admin/users/${observer.user_id}/mute`, { hours: 24 }, seller.session_token)).status, 403);
        assert.equal((await request('PUT', `/admin/users/${observer.user_id}/mute`, { hours: 24 }, buyer.session_token)).status, 200);
        assert.equal((await request('POST', `/item/${itemId}/question`, { question_text: 'Can I post?' }, observer.session_token)).status, 403);
        assert.equal((await request('DELETE', `/question/${questionId}`, undefined, buyer.session_token)).status, 200);
        assert.equal((await request('PUT', `/admin/users/${observer.user_id}/mute`, { hours: 0 }, buyer.session_token)).status, 200);
        assert.equal((await request('POST', `/item/${itemId}/question`, { question_text: 'Can I post now?' }, observer.session_token)).status, 200);
    });
    it('searches with pagination, account filters and private-field-free profiles', async () => {
        const result = await request('GET', '/search?q=LEGO&limit=1&offset=0');
        assert.equal(result.data.length, 1); assert.equal(result.total, '1');
        assert.equal((await request('GET', '/search?offset=3')).data.length, 0);
        assert.equal((await request('GET', '/search?status=OPEN', undefined, seller.session_token)).data.length, 3);
        assert.equal((await request('GET', '/search?status=OPEN', undefined, buyer.session_token)).data.length, 0);
        assert.equal((await request('GET', '/search?status=BID', undefined, buyer.session_token)).data.length, 1);
        assert.equal((await request('GET', '/search?limit=101')).status, 400);
        assert.equal((await request('GET', '/search?status=UNKNOWN')).status, 400);
        assert.equal((await request('GET', '/search?status=BID')).status, 400);
        const user = (await request('GET', `/users/${seller.user_id}`)).data;
        assert.equal(user.selling.length, 3); assert.equal(user.password, undefined); assert.equal(user.email, undefined);
    });
    it('archives expired auctions and prevents late bids', async () => {
        await run('UPDATE items SET end_date=? WHERE item_id=?', [Math.floor(Date.now()/1000)-1, itemId]);
        assert.equal((await request('POST', `/item/${itemId}/bid`, { amount: 30 }, buyer.session_token)).status, 400);
        assert.equal((await request('GET', '/search?status=ARCHIVE', undefined, seller.session_token)).data.length, 1);
        assert.equal((await request('GET', `/users/${seller.user_id}`)).data.auctions_ended.length, 1);
    });
    it('sorts before pagination and rejects unknown sorting', async () => {
        assert.equal((await request('GET', '/search?sort=price&limit=1')).data[0].current_bid, 20);
        assert.equal((await request('GET', '/search?sort=newest')).status, 200);
        assert.equal((await request('GET', '/search?sort=invalid')).status, 400);
    });
    it('returns not found for nonexistent resources', async () => {
        for (const path of ['/item/9999', '/item/9999/bid', '/item/9999/question', '/users/9999']) assert.equal((await request('GET', path)).status, 404);
        assert.equal((await request('POST', '/question/9999', { answer_text: 'Yes' }, seller.session_token)).status, 404);
    });
    it('rejects malformed documented path IDs before looking up resources', async () => {
        for (const path of ['/item/not-an-id', '/item/not-an-id/bid', '/item/not-an-id/question', '/users/not-an-id']) {
            assert.equal((await request('GET', path)).status, 400);
        }
        assert.equal((await request('POST', '/question/not-an-id', { answer_text: 'Yes' }, seller.session_token)).status, 400);
    });
    it('invalidates the server session on logout', async () => {
        assert.equal((await request('POST', '/logout', {}, buyer.session_token)).status, 200);
        assert.equal((await request('GET', '/users/me', undefined, buyer.session_token)).status, 401);
        assert.equal((await request('POST', '/logout', {}, buyer.session_token)).status, 401);
    });
    it('requires the current password, hashes the replacement and invalidates the session', async () => {
        assert.equal((await request('PUT', '/users/password', { current_password: 'wrong', password: 'Replacement123!' }, seller.session_token)).status, 400);
        assert.equal((await request('PUT', '/users/password', { current_password: 'Example123!', password: 'Replacement123!' }, seller.session_token)).status, 200);
        assert.equal((await request('GET', '/users/me', undefined, seller.session_token)).status, 401);
        assert.equal((await request('POST', '/login', { email: 'seller@example.com', password: 'Example123!' })).status, 400);
        assert.equal((await request('POST', '/login', { email: 'seller@example.com', password: 'Replacement123!' })).status, 200);
        const row = await new Promise((resolve, reject) => db.get('SELECT password FROM users WHERE email=?', ['seller@example.com'], (err, value) => err ? reject(err) : resolve(value)));
        assert.match(row.password, /^scrypt\$/);
        assert.ok(!row.password.includes('Replacement123!'));
    });
    it('resets a password only when the complete email and name match', async () => {
        const valid = { email: 'seller@example.com', first_name: 'seller', last_name: 'Test', password: 'Recovery123!' };
        const rejected = await request('POST', '/users/password-reset', { ...valid, first_name: 'wrong' });
        assert.equal(rejected.status, 400);
        assert.ok(!JSON.stringify(rejected.data).includes(valid.email));
        assert.equal((await request('POST', '/users/password-reset', valid)).status, 200);
        assert.equal((await request('POST', '/login', { email: valid.email, password: 'Replacement123!' })).status, 400);
        assert.equal((await request('POST', '/login', { email: valid.email, password: valid.password })).status, 200);
    });
});
