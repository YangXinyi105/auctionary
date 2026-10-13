const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
async function hash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${key.toString('hex')}`;
}
async function verify(password, stored) {
    if (typeof password !== 'string' || typeof stored !== 'string') return false;
    const [type, salt, value] = stored.split('$');
    if (type !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(value || '')) return false;
    return crypto.timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(value, 'hex'));
}
async function migrate() {
    const { all, run } = require('./auction.store');
    for (const user of await all('SELECT user_id,password FROM users')) {
        if (!user.password.startsWith('scrypt$')) await run('UPDATE users SET password=?,salt=NULL WHERE user_id=?', [await hash(user.password), user.user_id]);
    }
}
module.exports = { hash, verify, migrate };
