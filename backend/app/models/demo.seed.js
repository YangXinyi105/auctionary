const { get, run } = require('./auction.store');
const { hash } = require('./passwords');

const users = [
    [1, 'Xinyi', 'Yang', 'xinyi.demo@example.com', 'Auctionary123!'],
    [2, 'Ash', 'Ketchum', 'ash.test@example.com', 'Pokemon123!'],
    [3, 'Misty', 'Waterflower', 'misty.test@example.com', 'Pokemon123!'],
    [4, 'Brock', 'Stone', 'brock.test@example.com', 'Pokemon123!']
];

const items = [
    [1, 'LEGO Classic Large Bricks', 'A versatile classic set with colorful bricks for an open-ended collection.', 18, 2, 'lego-10698.jpg', ['Classic']],
    [2, 'LEGO City Passenger Plane', 'A complete city aviation set with a clean box and all main pieces.', 95, 3, 'lego-60367.jpg', ['City']],
    [3, 'LEGO Icons Loop Coaster', 'A detailed display set for builders who enjoy moving mechanisms and large builds.', 52, 4, 'lego-10303.jpg', ['Icons']],
    [4, 'LEGO Creator Majestic Tiger', 'A three-in-one animal build with a strong display presence.', 47, 2, 'lego-31129.jpg', ['Creator']],
    [5, 'LEGO NINJAGO City Markets', 'A large modular city set with many rooms, characters and details.', 39, 3, 'lego-71799.jpg', ['City', 'NINJAGO']],
    [6, 'LEGO Star Wars Millennium Falcon', 'A spacecraft display set for Star Wars collectors and builders.', 24, 4, 'lego-75375.jpg', ['Star Wars']],
    [7, 'LEGO City Freight Train', 'A working train set with a practical city theme and track pieces.', 31, 2, 'lego-60440.jpg', ['City']],
    [8, 'LEGO Horizon Tallneck', 'A characterful display model with a scenic base and collector appeal.', 28, 3, 'lego-76989.jpg', ['Gaming']],
    [9, 'LEGO Batman Gotham City', 'A graphic Gotham City display build with a strong shelf silhouette.', 21, 4, 'lego-76271.jpg', ['City', 'Batman']],
    [10, 'LEGO Super Mario World', 'A nostalgic interactive display set inspired by a classic game scene.', 36, 2, 'lego-71438.jpg', ['Gaming']],
    [11, 'Minecraft Mini Biome', "Collector's Edition Minecraft set with detailed biomes, waterfalls, caves, beaches and hidden treasure.", 50, 1, 'lego-minecraft.png', ['Other', 'Minecraft']]
];

async function seed() {
    if (process.env.AUCTION_DB === ':memory:') return;
    if ((await get('SELECT COUNT(*) count FROM users')).count || (await get('SELECT COUNT(*) count FROM items')).count) return;
    const now = Math.floor(Date.now() / 1000);
    await run('BEGIN IMMEDIATE');
    try {
        for (const [id, firstName, lastName, email, password] of users) {
            await run('INSERT INTO users(user_id,first_name,last_name,email,password,salt,session_token) VALUES(?,?,?,?,?,NULL,NULL)', [id, firstName, lastName, email, await hash(password)]);
        }
        for (const [index, item] of items.entries()) {
            const [id, name, description, price, creatorId, image, categories] = item;
            await run('INSERT INTO items(item_id,name,description,starting_bid,start_date,end_date,creator_id) VALUES(?,?,?,?,?,?,?)', [id, name, description, price, now - 86400, now + (index + 2) * 86400, creatorId]);
            await run('INSERT INTO item_images(item_id,image_url) VALUES(?,?)', [id, `/uploads/${image}`]);
            for (const categoryName of categories) {
                await run('INSERT OR IGNORE INTO categories(name) VALUES(?)', [categoryName]);
                const category = await get('SELECT category_id FROM categories WHERE lower(name)=lower(?)', [categoryName]);
                await run('INSERT INTO item_categories(item_id,category_id) VALUES(?,?)', [id, category.category_id]);
            }
        }
        await run('INSERT INTO bids(item_id,user_id,amount,timestamp) VALUES(?,?,?,?)', [7, 1, 100, now]);
        await run('INSERT INTO set_collection(user_id,name,total,collected) VALUES(?,?,?,?)', [1, 'LEGO Super Mario World', 33, 2]);
        await run('COMMIT');
    } catch (error) {
        await run('ROLLBACK');
        throw error;
    }
}

module.exports = { seed };
