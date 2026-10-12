const db = require('../../database');

const addUser = (user, done) => {
    require('./passwords').hash(user.password).then(password => {
    const sql = `
        INSERT INTO users (first_name, last_name, email, password)
        VALUES (?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            user.first_name,
            user.last_name,
            user.email,
            password
        ],
        function(err) {
            if (err) {
                return done(err);
            }

            return done(null, this.lastID);
        }
    );
    }).catch(done);
};

const findByEmail = (email, done) => {

    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
    `;


    db.get(
        sql,
        [email],
        (err, row)=>{

            if(err){
                return done(err);
            }


            return done(null, row);

        }
    );

};

const saveToken = (user_id, token, done)=>{


    const sql = `
        UPDATE users
        SET session_token = ?
        WHERE user_id = ?
    `;


    db.run(
        sql,
        [
            token,
            user_id
        ],
        function(err){

            if(err){
                return done(err);
            }


            return done(null);

        }
    );

};

const removeToken = (token, done)=>{


    const sql = `
        UPDATE users
        SET session_token = NULL
        WHERE session_token = ?
    `;


    db.run(
        sql,
        [token],
        function(err){

            if(err){
                return done(err);
            }


            return done(null, this.changes);

        }
    );


};

const findByToken = (token, done) => {
    db.get('SELECT user_id,first_name,last_name,email FROM users WHERE session_token=?', [token], done);
};

const updatePassword = (user_id, password, done) => {
    require('./passwords').hash(password).then(hash => db.run('UPDATE users SET password=?,session_token=NULL WHERE user_id=?', [hash, user_id], done)).catch(done);
};


module.exports = {
    addUser,
    findByEmail,
    saveToken,
    removeToken,
    findByToken,
    updatePassword
};
