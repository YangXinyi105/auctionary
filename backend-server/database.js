const sqlite3 = require('sqlite3').verbose();

const path = require('path');
const DBSOURCE = process.env.AUCTION_DB || path.join(__dirname, 'db.sqlite');
let readyResolve;
let readyReject;
const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if(err){
        console.log(err.message);
        throw err;
    }else{
        console.log('Connected to the SQLite database.')

        db.run(`CREATE TABLE users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name text,
                last_name text,
                email text UNIQUE,
                password text,
                salt text,
                session_token text,
                CONSTRAINT email_unique UNIQUE (email)
            )`, (err) => {
                if(err){
                    console.log('Users table already created');
                }else{
                    console.log('Users table created');
                }
            }
        );

        
        db.run(`CREATE TABLE items (
                item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                starting_bid INTEGER,
                start_date INTEGER,
                end_date INTEGER,
                creator_id INTEGER,
                FOREIGN KEY(creator_id) REFERENCES users(user_id)
            )`, (err) => {
                if(err){
                    console.log('Items table already created');
                }else{
                    console.log('Items table created');
                }
            }
        );

        db.run(`CREATE TABLE bids (
                item_id INTEGER,
                user_id INTEGER,
                amount INTEGER,
                timestamp INTEGER,
                PRIMARY KEY (item_id, user_id, amount),
                FOREIGN KEY (item_id) REFERENCES items(item_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )`, (err) => {
                if(err){
                    // console.log(err)
                    console.log('Bid table already created');
                }else{
                    console.log('Bid table created');
                }
            }
        );

        db.run(`CREATE TABLE questions (
                question_id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT,
                answer TEXT,
                asked_by INTEGER,
                item_id INTEGER,
                FOREIGN KEY (asked_by) REFERENCES users(user_id),
                FOREIGN KEY (item_id) REFERENCES items(item_id)
            )`, (err) => {
                if(err){
                    console.log('Questions table already created');
                }else{
                    console.log('Questions table created');
                }
            }
        );

        db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS set_collection (
            collection_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            total INTEGER NOT NULL CHECK(total > 0),
            collected INTEGER NOT NULL CHECK(collected >= 0 AND collected <= total),
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS demo_items (
            item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            starting_bid INTEGER NOT NULL,
            start_date INTEGER NOT NULL,
            end_date INTEGER NOT NULL,
            image_url TEXT,
            rarity TEXT,
            creator_id INTEGER
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS demo_bids (
            bid_id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY(item_id) REFERENCES demo_items(item_id),
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )`);

        db.run('ALTER TABLE demo_items ADD COLUMN creator_id INTEGER', () => {});
        db.run(`CREATE TABLE IF NOT EXISTS item_images (
            item_id INTEGER PRIMARY KEY, image_url TEXT NOT NULL,
            FOREIGN KEY(item_id) REFERENCES items(item_id)
        )`);
        db.run('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)');
        db.get('SELECT 1', err => err ? readyReject(err) : readyResolve());
        });
    }
});

db.ready = ready;
module.exports = db;
