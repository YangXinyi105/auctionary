const Joi = require('joi');
const { offensive } = require('../models/extensions');
const { get, all, run, selectItems } = require('../models/auction.store');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const fail = (res, status, message) => res.status(status).json({ error_message: message });
const auth = async (req, res, failureStatus = 401) => {
    const token = req.get('X-Authorization');
    const user = token && await get('SELECT user_id FROM users WHERE session_token=?', [token]);
    if (!user) { fail(res, failureStatus, 'Please sign in again.'); return null; }
    return user.user_id;
};
const admin = async (req, res) => {
    const token = req.get('X-Authorization');
    const user = token && await get('SELECT user_id,is_admin FROM users WHERE session_token=?', [token]);
    if (!user) { fail(res, 401, 'Please sign in again.'); return null; }
    if (!user.is_admin) { fail(res, 403, 'Administrator access is required.'); return null; }
    return user;
};
const validate = (res, schema, body, convert = false) => {
    const { error, value } = schema.validate(body, { convert });
    if (error) { fail(res, 400, error.details[0].message); return null; }
    return value;
};
const parseId = (res, raw, label) => {
    if (!/^\d+$/.test(String(raw)) || !Number.isSafeInteger(Number(raw))) {
        fail(res, 400, `Invalid ${label} ID.`);
        return null;
    }
    return Number(raw);
};
const itemSchema = Joi.object({
    name: Joi.string().trim().required(), description: Joi.string().trim().required(),
    starting_bid: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER).required(),
    end_date: Joi.number().integer().max(8640000000000).required(),
    image_url: Joi.string().uri().optional(),
    category_ids: Joi.array().items(Joi.number().integer().positive()).unique().max(12).optional(),
    custom_category: Joi.string().trim().max(40).allow('').optional()
});
module.exports = app => {
    app.get('/categories', wrap(async (req, res) => res.json(await all('SELECT * FROM categories ORDER BY name'))));
    app.get('/users/:user_id', wrap(async (req, res) => {
        const userId = parseId(res, req.params.user_id, 'user'); if (userId === null) return;
        const user = await get('SELECT user_id,first_name,last_name,avatar_url FROM users WHERE user_id=?', [userId]);
        if (!user) return res.sendStatus(404);
        const now = Math.floor(Date.now() / 1000);
        user.selling = await all(`${selectItems} WHERE i.creator_id=? AND i.end_date>? ORDER BY i.end_date`, [user.user_id, now]);
        user.bidding_on = await all(`${selectItems} WHERE EXISTS(SELECT 1 FROM bids b WHERE b.item_id=i.item_id AND b.user_id=?) ORDER BY i.end_date`, [user.user_id]);
        user.auctions_ended = await all(`${selectItems} WHERE i.creator_id=? AND i.end_date<=? ORDER BY i.end_date DESC`, [user.user_id, now]);
        res.json(user);
    }));
    app.get(['/search', '/items'], wrap(async (req, res) => {
        const { q = '', status, limit = '20', offset = '0', sort = 'ending', category_id } = req.query;
        if (typeof q !== 'string' || (status !== undefined && !['BID', 'OPEN', 'ARCHIVE'].includes(status)) ||
            !/^\d+$/.test(String(limit)) || !/^\d+$/.test(String(offset)) || Number(limit) < 1 || Number(limit) > 100 || !Number.isSafeInteger(Number(offset))) return fail(res, 400, 'Invalid search parameters.');
        if (!['ending', 'price', 'newest'].includes(sort)) return fail(res, 400, 'Invalid sort order.');
        let where = ' WHERE instr(lower(i.name),lower(?))>0';
        const args = [q];
        if (category_id !== undefined) {
            if (!/^\d+$/.test(String(category_id)) || Number(category_id) < 1) return fail(res, 400, 'Invalid category.');
            where += ' AND EXISTS(SELECT 1 FROM item_categories ic WHERE ic.item_id=i.item_id AND ic.category_id=?)'; args.push(Number(category_id));
        }
        if (status) {
            const user = await auth(req, res, 400); if (!user) return;
            if (status === 'BID') { where += ' AND EXISTS(SELECT 1 FROM bids b WHERE b.item_id=i.item_id AND b.user_id=?)'; args.push(user); }
            else { where += ` AND i.creator_id=? AND i.end_date${status === 'OPEN' ? '>' : '<='}?`; args.push(user, Math.floor(Date.now() / 1000)); }
        }
        const count = await get(`SELECT COUNT(*) total FROM items i${where}`, args);
        res.set('X-Total-Count', String(count.total));
        const order = { ending: 'i.end_date,i.item_id', price: 'current_bid DESC,i.item_id', newest: 'i.start_date DESC,i.item_id DESC' }[sort];
        res.json(await all(`${selectItems}${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, Number(limit), Number(offset)]));
    }));
    app.post(['/item', '/items'], wrap(async (req, res) => {
        const user = await auth(req, res); if (!user) return;
        const value = validate(res, itemSchema, req.body, true); if (!value) return;
        if (offensive(value.name) || offensive(value.description) || offensive(value.custom_category)) return fail(res, 400, 'Please remove offensive language from the listing.');
        for (const id of value.category_ids || []) if (!await get('SELECT category_id FROM categories WHERE category_id=?', [id])) return fail(res, 400, 'Unknown category.');
        const now = Math.floor(Date.now() / 1000);
        if (value.end_date <= now) return fail(res, 400, 'Auction must end in the future.');
        const result = await run('INSERT INTO items(name,description,starting_bid,start_date,end_date,creator_id) VALUES(?,?,?,?,?,?)', [value.name, value.description, value.starting_bid, now, value.end_date, user]);
        if (value.image_url) await run('INSERT INTO item_images(item_id,image_url) VALUES(?,?)', [result.id, value.image_url]);
        for (const id of value.category_ids || []) await run('INSERT INTO item_categories(item_id,category_id) VALUES(?,?)', [result.id, id]);
        if (value.custom_category) {
            let custom = await get('SELECT category_id FROM categories WHERE lower(name)=lower(?)', [value.custom_category]);
            if (!custom) {
                await run('INSERT INTO categories(name) VALUES(?)', [value.custom_category]);
                custom = await get('SELECT category_id FROM categories WHERE lower(name)=lower(?)', [value.custom_category]);
            }
            await run('INSERT OR IGNORE INTO item_categories(item_id,category_id) VALUES(?,?)', [result.id, custom.category_id]);
        }
        res.status(201).json({ item_id: result.id });
    }));
    app.get(['/item/:id', '/items/:id'], wrap(async (req, res) => {
        const itemId = parseId(res, req.params.id, 'item'); if (itemId === null) return;
        const item = await get(`${selectItems} WHERE i.item_id=?`, [itemId]);
        if (!item) return res.sendStatus(404);
        item.current_bid_holder = await get('SELECT u.user_id,u.first_name,u.last_name FROM bids b JOIN users u ON u.user_id=b.user_id WHERE b.item_id=? ORDER BY b.amount DESC,b.timestamp ASC LIMIT 1', [item.item_id]) || null;
        item.categories = await all('SELECT c.* FROM categories c JOIN item_categories ic ON ic.category_id=c.category_id WHERE ic.item_id=?', [item.item_id]);
        res.json(item);
    }));
    app.get(['/item/:id/bid', '/items/:id/bids'], wrap(async (req, res) => {
        const itemId = parseId(res, req.params.id, 'item'); if (itemId === null) return;
        if (!await get('SELECT item_id FROM items WHERE item_id=?', [itemId])) return res.sendStatus(404);
        res.json(await all('SELECT b.*,u.first_name,u.last_name FROM bids b JOIN users u ON u.user_id=b.user_id WHERE b.item_id=? ORDER BY b.amount DESC,b.timestamp DESC', [itemId]));
    }));
    app.post(['/item/:id/bid', '/items/:id/bids'], wrap(async (req, res) => {
        const user = await auth(req, res); if (!user) return;
        const value = validate(res, Joi.object({ amount: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required() }), req.body); if (!value) return;
        const itemId = parseId(res, req.params.id, 'item'); if (itemId === null) return;
        const item = await get('SELECT * FROM items WHERE item_id=?', [itemId]);
        if (!item) return res.sendStatus(404);
        if (item.creator_id === user) return fail(res, 403, 'You cannot bid on your own auction.');
        // The condition and insert execute in one SQLite statement, preventing concurrent stale bids.
        const result = await run(`INSERT INTO bids(item_id,user_id,amount,timestamp)
            SELECT item_id,?,?,? FROM items WHERE item_id=? AND end_date>CAST(strftime('%s','now') AS INTEGER)
            AND ? > COALESCE((SELECT MAX(amount) FROM bids WHERE item_id=?),starting_bid)`,
        [user, value.amount, Math.floor(Date.now() / 1000), item.item_id, value.amount, item.item_id]);
        if (!result.changes) return fail(res, 400, 'Auction ended or bid is no longer high enough. Refresh and retry.');
        res.sendStatus(201);
    }));
    app.get('/item/:id/question', wrap(async (req, res) => {
        const itemId = parseId(res, req.params.id, 'item'); if (itemId === null) return;
        if (!await get('SELECT item_id FROM items WHERE item_id=?', [itemId])) return res.sendStatus(404);
        res.json(await all(`SELECT q.question_id,q.question question_text,q.answer answer_text,q.asked_by,
            u.first_name,u.last_name,u.muted_until,u.avatar_url
            FROM questions q JOIN users u ON u.user_id=q.asked_by
            WHERE q.item_id=? ORDER BY q.question_id DESC`, [itemId]));
    }));
    app.post('/item/:id/question', wrap(async (req, res) => {
        const user = await auth(req, res); if (!user) return;
        const account = await get('SELECT muted_until FROM users WHERE user_id=?', [user]);
        if (account.muted_until && account.muted_until > Math.floor(Date.now() / 1000)) return fail(res, 403, 'Your account is muted and cannot post questions yet.');
        const value = validate(res, Joi.object({ question_text: Joi.string().trim().required() }), req.body); if (!value) return;
        if (offensive(value.question_text)) return fail(res, 400, 'Please remove offensive language from the question.');
        const itemId = parseId(res, req.params.id, 'item'); if (itemId === null) return;
        const item = await get('SELECT creator_id FROM items WHERE item_id=?', [itemId]);
        if (!item) return res.sendStatus(404);
        if (item.creator_id === user) return fail(res, 403, 'You cannot ask a question on your own item.');
        await run('INSERT INTO questions(question,asked_by,item_id) VALUES(?,?,?)', [value.question_text, user, itemId]);
        res.sendStatus(200);
    }));
    app.post('/question/:id', wrap(async (req, res) => {
        const user = await auth(req, res); if (!user) return;
        const value = validate(res, Joi.object({ answer_text: Joi.string().trim().required() }), req.body); if (!value) return;
        if (offensive(value.answer_text)) return fail(res, 400, 'Please remove offensive language from the answer.');
        const questionId = parseId(res, req.params.id, 'question'); if (questionId === null) return;
        const question = await get('SELECT i.creator_id FROM questions q JOIN items i ON i.item_id=q.item_id WHERE q.question_id=?', [questionId]);
        if (!question) return res.sendStatus(404);
        if (question.creator_id !== user) return fail(res, 403, 'Only the seller can answer this question.');
        await run('UPDATE questions SET answer=? WHERE question_id=?', [value.answer_text, questionId]);
        res.sendStatus(200);
    }));
    app.delete('/question/:id', wrap(async (req, res) => {
        const user = await auth(req, res); if (!user) return;
        const questionId = parseId(res, req.params.id, 'question'); if (questionId === null) return;
        const question = await get('SELECT asked_by FROM questions WHERE question_id=?', [questionId]);
        if (!question) return res.sendStatus(404);
        const account = await get('SELECT is_admin FROM users WHERE user_id=?', [user]);
        if (question.asked_by !== user && !account.is_admin) return fail(res, 403, 'You can only delete your own questions.');
        const result = await run('DELETE FROM questions WHERE question_id=?', [questionId]);
        res.sendStatus(200);
    }));
    app.put('/admin/users/:id/mute', wrap(async (req, res) => {
        const moderator = await admin(req, res); if (!moderator) return;
        const value = validate(res, Joi.object({ hours: Joi.number().integer().min(0).max(720).required() }), req.body); if (!value) return;
        const userId = parseId(res, req.params.id, 'user'); if (userId === null) return;
        const target = await get('SELECT user_id,is_admin FROM users WHERE user_id=?', [userId]);
        if (!target) return res.sendStatus(404);
        if (target.is_admin) return fail(res, 403, 'Administrators cannot mute other administrators.');
        const mutedUntil = value.hours === 0 ? null : Math.floor(Date.now() / 1000) + value.hours * 3600;
        await run('UPDATE users SET muted_until=? WHERE user_id=?', [mutedUntil, target.user_id]);
        res.json({ user_id: target.user_id, muted_until: mutedUntil });
    }));
};
