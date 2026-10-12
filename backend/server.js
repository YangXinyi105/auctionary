const express = require('express');
const morgan  = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');


const app = express();
app.set('trust proxy', 1);
app.use(cors({ exposedHeaders: ['X-Total-Count'] }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Server port
const HTTP_PORT = Number(process.env.PORT || 3334);

// Start server
const ready = require('./app/models/auction.store').migrate().then(() => require('./app/models/passwords').migrate()).then(() => require('./app/models/extensions').migrate());
app.use((req, res, next) => ready.then(() => next()).catch(next));

// Logging
app.use(morgan('tiny'));

// Body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '9mb' }));

// Root endpoint
app.get('/', (req, res, next) => {
    res.json({'status': 'Alive'});
});

// Other API endpoints: Links go here...
// You can uncomment the below three lines as you implement the functionality - we'll discuss this structure in week three.
require('./app/routes/user.server.routes')(app);
require('./app/routes/core.server.routes')(app);
require('./app/routes/collection.routes')(app);
app.post('/upload-card-image', (req, res) => {
    const token = req.get('X-Authorization');
    if (!token) return res.sendStatus(401);
    const db = require('./database');
    db.get('SELECT user_id FROM users WHERE session_token=?', [token], (err, user) => {
        if (err) return res.sendStatus(500);
        if (!user) return res.sendStatus(401);
        const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(req.body.image || '');
        if (!match) return res.status(400).json({ error_message: 'Upload a JPG, PNG, WEBP or GIF image' });
        const image = Buffer.from(match[2], 'base64');
        if (image.length > 6 * 1024 * 1024) return res.status(413).json({ error_message: 'Image must be smaller than 6 MB' });
        const dir = path.join(__dirname, 'uploads');
        fs.mkdirSync(dir, { recursive: true });
        const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[match[1]];
        const filename = `${crypto.randomUUID()}${ext}`;
        fs.writeFile(path.join(dir, filename), image, writeErr => {
            if (writeErr) return res.sendStatus(500);
            const publicOrigin = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
            res.status(201).json({ image_url: `${publicOrigin}/uploads/${filename}` });
        });
    });
});
// require('./app/routes/core.server.routes')(app);
// require('./app/routes/question.server.routes')(app);


// Default response for any other request
app.use((req, res) => {
    res.sendStatus(404);
});
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(err.status === 400 ? 400 : 500).json({ error_message: err.status === 400 ? 'Invalid JSON request.' : 'Server error. Please retry.' });
});
if (require.main === module) ready.then(() => app.listen(HTTP_PORT, () => console.log('Server running on port: ' + HTTP_PORT))).catch(err => { console.error(err); process.exitCode = 1; });
module.exports = { app, ready };
