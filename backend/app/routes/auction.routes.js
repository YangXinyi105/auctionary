const db = require('../../database');

module.exports = function (app) {
    app.post('/items', (req, res) => {
        const token = req.get('X-Authorization');
        if (!token) return res.sendStatus(401);
        const { name, description, starting_bid, end_date, image_url } = req.body;
        if (!String(name || '').trim() || !String(description || '').trim() || !Number.isFinite(Number(starting_bid)) || Number(starting_bid) <= 0 || !Number.isFinite(Number(end_date)) || Number(end_date) <= Math.floor(Date.now()/1000) || !String(image_url || '').startsWith(`http://localhost:${process.env.PORT || 3334}/uploads/`)) {
            return res.status(400).json({ error_message: 'Complete all fields and upload a valid set image' });
        }
        db.get('SELECT user_id FROM users WHERE session_token=?', [token], (userErr, user) => {
            if (userErr) return res.sendStatus(500);
            if (!user) return res.sendStatus(401);
            const now = Math.floor(Date.now()/1000);
            db.run('INSERT INTO demo_items (name,description,starting_bid,start_date,end_date,image_url,rarity,creator_id) VALUES (?,?,?,?,?,?,?,?)', [String(name).trim(), String(description).trim(), Number(starting_bid), now, Number(end_date), image_url, 'USER LISTED', user.user_id], function (insertErr) {
                if (insertErr) return res.status(500).json({ error_message: 'Could not create auction' });
                res.status(201).json({ item_id: this.lastID });
            });
        });
    });

    app.get('/items', (req, res) => {
        db.all(`SELECT i.*, COALESCE(MAX(b.amount), i.starting_bid) AS current_bid, COUNT(b.bid_id) AS bid_count
                FROM demo_items i LEFT JOIN demo_bids b ON b.item_id=i.item_id
                WHERE i.creator_id IS NOT NULL GROUP BY i.item_id ORDER BY i.end_date ASC`, [], (err, rows) => {
            if (err) return res.status(500).json({ error_message: 'Could not load auctions' });
            res.json(rows);
        });
    });

    app.get('/items/:id', (req, res) => {
        db.get(`SELECT i.*, COALESCE(MAX(b.amount), i.starting_bid) AS current_bid, COUNT(b.bid_id) AS bid_count
                FROM demo_items i LEFT JOIN demo_bids b ON b.item_id=i.item_id WHERE i.item_id=? GROUP BY i.item_id`, [req.params.id], (err, row) => {
            if (err) return res.sendStatus(500);
            if (!row) return res.sendStatus(404);
            res.json(row);
        });
    });

    app.get('/items/:id/bids', (req, res) => {
        db.all(`SELECT b.amount,b.timestamp,u.first_name,u.last_name FROM demo_bids b JOIN users u ON u.user_id=b.user_id WHERE b.item_id=? ORDER BY b.amount DESC,b.timestamp DESC`, [req.params.id], (err, rows) => {
            if (err) return res.sendStatus(500);
            res.json(rows);
        });
    });

    app.post('/items/:id/bids', (req, res) => {
        const token = req.get('X-Authorization');
        const amount = Number(req.body.amount);
        if (!token) return res.sendStatus(401);
        if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error_message: 'Enter a valid bid amount' });
        db.get('SELECT user_id FROM users WHERE session_token=?', [token], (userErr, user) => {
            if (userErr) return res.sendStatus(500);
            if (!user) return res.sendStatus(401);
            db.get(`SELECT i.starting_bid,i.end_date,MAX(b.amount) AS highest FROM demo_items i LEFT JOIN demo_bids b ON b.item_id=i.item_id WHERE i.item_id=? GROUP BY i.item_id`, [req.params.id], (itemErr, item) => {
                if (itemErr) return res.sendStatus(500);
                if (!item) return res.sendStatus(404);
                if (item.end_date <= Math.floor(Date.now()/1000)) return res.status(400).json({ error_message: 'This auction has ended' });
                if (amount <= (item.highest || item.starting_bid)) return res.status(400).json({ error_message: `Bid must be greater than £${item.highest || item.starting_bid}` });
                db.run('INSERT INTO demo_bids (item_id,user_id,amount,timestamp) VALUES (?,?,?,?)', [req.params.id,user.user_id,amount,Math.floor(Date.now()/1000)], function (bidErr) {
                    if (bidErr) return res.sendStatus(500);
                    res.status(201).json({ bid_id: this.lastID, message: 'Bid placed' });
                });
            });
        });
    });
};
