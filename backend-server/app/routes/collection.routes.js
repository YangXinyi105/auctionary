const db = require('../../database');

module.exports = function (app) {
    const authenticate = (req, res, next) => {
        const token = req.get('X-Authorization');
        if (!token) return res.sendStatus(401);
        db.get('SELECT user_id FROM users WHERE session_token=?', [token], (err, user) => {
            if (err) return res.sendStatus(500);
            if (!user) return res.sendStatus(401);
            req.collectionUser = user.user_id;
            next();
        });
    };
    const validate = (req, res, next) => {
        const { name, total, collected } = req.body;
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
            !Number.isSafeInteger(total) || total < 1 || total > 1000000 ||
            !Number.isSafeInteger(collected) || collected < 0 || collected > total) {
            return res.status(400).json({ error_message: 'Invalid collection values' });
        }
        next();
    };
    app.get('/collections', authenticate, (req, res) => {
        db.all('SELECT collection_id,name,total,collected FROM set_collection WHERE user_id=? ORDER BY collection_id DESC', [req.collectionUser], (err, rows) => {
            if (err) return res.sendStatus(500);
            res.json(rows);
        });
    });
    app.post('/collections', authenticate, validate, (req, res) => {
        const { name, total, collected } = req.body;
        db.run('INSERT INTO set_collection(user_id,name,total,collected) VALUES(?,?,?,?)', [req.collectionUser, name.trim(), total, collected], function (err) {
            if (err) return res.sendStatus(500);
            res.status(201).json({ collection_id: this.lastID, name: name.trim(), total, collected });
        });
    });
    app.put('/collections/:id', authenticate, validate, (req, res) => {
        const { name, total, collected } = req.body;
        db.run('UPDATE set_collection SET name=?,total=?,collected=? WHERE collection_id=? AND user_id=?', [name.trim(), total, collected, req.params.id, req.collectionUser], function (err) {
            if (err) return res.sendStatus(500);
            res.sendStatus(this.changes ? 204 : 404);
        });
    });
    app.delete('/collections/:id', authenticate, (req, res) => {
        db.run('DELETE FROM set_collection WHERE collection_id=? AND user_id=?', [req.params.id, req.collectionUser], function (err) {
            if (err) return res.sendStatus(500);
            res.sendStatus(this.changes ? 204 : 404);
        });
    });
};
