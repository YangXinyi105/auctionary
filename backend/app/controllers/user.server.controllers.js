const Joi = require("joi");
const userModel = require("../models/user.server.models");


const createUser = (req, res) => {

    const schema = Joi.object({
        first_name: Joi.string().trim().min(1).required(),
        last_name: Joi.string().trim().min(1).required(),
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });


    const { error } = schema.validate(req.body);


    if (error) {
        return res.status(400).send({
            error_message: error.details[0].message
        });
    }


    userModel.addUser(req.body, (err, user_id) => {

        if (err) {
            return res.status(400).send({
                error_message: err.message
            });
        }


        return res.status(201).send({
            user_id: user_id
        });

    });
};



// 登录
const login = (req, res) => {

    const validation = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() }).validate(req.body);
    if (validation.error) return res.status(400).json({ error_message: validation.error.details[0].message });

    const { email, password } = req.body;


    if (!email || !password) {
        return res.sendStatus(400);
    }


    userModel.findByEmail(email, async (err, user) => {

        if (err) {
            return res.sendStatus(500);
        }


        let valid = false;
        try { valid = !!user && await require('../models/passwords').verify(password, user.password); }
        catch { return res.sendStatus(500); }
        if (!valid) {
            return res.sendStatus(400);
        }


        const token = user.session_token || require('crypto').randomBytes(24).toString('hex');


        userModel.saveToken(
            user.user_id,
            token,
            (err)=>{

                if(err){
                    return res.sendStatus(500);
                }


                res.status(200).send({
                    user_id:user.user_id,
                    session_token:token
                });

            }
        );

    });

};



// 登出
const logout = (req,res)=>{

    const token = req.headers['x-authorization'];


    if(!token){
        return res.sendStatus(401);
    }


    userModel.removeToken(
        token,
        (err, changes)=>{

            if(err){
                return res.sendStatus(500);
            }


            res.sendStatus(changes ? 200 : 401);

        }
    );

};

const getCurrentUser = (req, res) => {
    const token = req.get('X-Authorization');
    if (!token) return res.sendStatus(401);
    userModel.findByToken(token, (err, user) => {
        if (err) return res.sendStatus(500);
        if (!user) return res.sendStatus(401);
        res.json({ user_id: user.user_id, first_name: user.first_name, last_name: user.last_name, email: user.email });
    });
};

const changePassword = (req, res) => {
    const token = req.get('X-Authorization');
    const password = req.body.password;
    const oldPassword = req.body.current_password;
    if (!token) return res.sendStatus(401);
    if (typeof password !== 'string' || password.length < 8 || password.length > 256 || typeof oldPassword !== 'string') return res.status(400).json({ error_message: 'Provide your current password and a new password of 8-256 characters' });
    userModel.findByToken(token, (err, user) => {
        if (err) return res.sendStatus(500);
        if (!user) return res.sendStatus(401);
        userModel.findByEmail(user.email, async (lookupErr, fullUser) => {
        if (lookupErr) return res.sendStatus(500);
        try {
        if (!await require('../models/passwords').verify(oldPassword, fullUser.password)) return res.status(400).json({ error_message: 'Current password is incorrect' });
        userModel.updatePassword(user.user_id, password, updateErr => {
            if (updateErr) return res.sendStatus(500);
            res.json({ message: 'Password updated' });
        });
        } catch { res.sendStatus(500); }
        });
    });
};



module.exports = {
    createUser,
    login,
    logout,
    getCurrentUser,
    changePassword
};
