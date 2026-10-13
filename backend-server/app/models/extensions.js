const { all, run } = require('./auction.store');
const { ENGLISH_WORDS, CHINESE_TERMS } = require('../config/profanity');
async function migrate() {
    await run('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0').catch(() => {});
    await run('ALTER TABLE users ADD COLUMN muted_until INTEGER').catch(() => {});
    await run('ALTER TABLE users ADD COLUMN avatar_url TEXT').catch(() => {});
    await run('CREATE TABLE IF NOT EXISTS categories(category_id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL)');
    await run('CREATE TABLE IF NOT EXISTS item_categories(item_id INTEGER NOT NULL,category_id INTEGER NOT NULL,PRIMARY KEY(item_id,category_id),FOREIGN KEY(item_id) REFERENCES items(item_id),FOREIGN KEY(category_id) REFERENCES categories(category_id))');
    for (const name of ['Classic','City','Icons','Creator','NINJAGO','Star Wars','Technic','Botanicals','Gaming','Batman','Other']) await run('INSERT OR IGNORE INTO categories(name) VALUES(?)', [name]);
    if ((await all("SELECT name FROM app_migrations WHERE name='categories-v1'")).length) return;
    for (const category of await all('SELECT * FROM categories')) {
        for (const name of category.name === 'Gaming' ? ['Horizon', 'Super Mario'] : [category.name]) await run('INSERT OR IGNORE INTO item_categories SELECT item_id,? FROM items WHERE instr(lower(name),lower(?))>0', [category.category_id, name]);
    }
    await run("INSERT INTO app_migrations(name) VALUES('categories-v1')");
}
function offensive(text) {
    const normalized = String(text || '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();
    const englishMatch = ENGLISH_WORDS.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(normalized));
    return englishMatch || CHINESE_TERMS.some((term) => normalized.includes(term));
}
module.exports = { migrate, offensive };
