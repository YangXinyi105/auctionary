const db = require('../../database');
const get = (sql, args = []) => new Promise((resolve, reject) => db.get(sql, args, (err, row) => err ? reject(err) : resolve(row)));
const all = (sql, args = []) => new Promise((resolve, reject) => db.all(sql, args, (err, rows) => err ? reject(err) : resolve(rows)));
const run = (sql, args = []) => new Promise((resolve, reject) => db.run(sql, args, function (err) { err ? reject(err) : resolve({ id: this.lastID, changes: this.changes }); }));
const selectItems = `SELECT i.*, u.first_name, u.last_name, im.image_url,
    COALESCE((SELECT MAX(amount) FROM bids WHERE item_id=i.item_id),i.starting_bid) current_bid,
    (SELECT COUNT(*) FROM bids WHERE item_id=i.item_id) bid_count
    FROM items i JOIN users u ON u.user_id=i.creator_id LEFT JOIN item_images im ON im.item_id=i.item_id`;

// Copy once; retain the old tables and IDs where available. No user data is removed.
async function migrate() {
    await db.ready;
    if (await get('SELECT name FROM app_migrations WHERE name=?', ['canonical-auctions-v1'])) return;
    await run('BEGIN IMMEDIATE');
    try {
        for (const item of await all('SELECT * FROM demo_items')) {
            let id = item.item_id;
            const fields = [item.name, item.description, item.starting_bid, item.start_date, item.end_date, item.creator_id];
            if (await get('SELECT item_id FROM items WHERE item_id=?', [id])) {
                id = (await run('INSERT INTO items(name,description,starting_bid,start_date,end_date,creator_id) VALUES(?,?,?,?,?,?)', fields)).id;
            } else await run('INSERT INTO items(item_id,name,description,starting_bid,start_date,end_date,creator_id) VALUES(?,?,?,?,?,?,?)', [id, ...fields]);
            if (item.image_url) await run('INSERT INTO item_images(item_id,image_url) VALUES(?,?)', [id, item.image_url]);
            await run('INSERT OR IGNORE INTO bids(item_id,user_id,amount,timestamp) SELECT ?,user_id,amount,timestamp FROM demo_bids WHERE item_id=?', [id, item.item_id]);
        }
        await run('INSERT INTO app_migrations(name) VALUES(?)', ['canonical-auctions-v1']);
        await run('COMMIT');
    } catch (err) { await run('ROLLBACK'); throw err; }
}
module.exports = { get, all, run, selectItems, migrate };
