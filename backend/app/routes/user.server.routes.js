const userController = require('../controllers/user.server.controllers');


module.exports = function(app){

    // 创建用户
    app.post('/users', userController.createUser);


    // 登录
    app.post('/login', userController.login);


    // 登出
    app.post('/logout', userController.logout);
    app.get('/users/me', userController.getCurrentUser);
    app.put('/users/password', userController.changePassword);
    app.put('/users/avatar', userController.updateAvatar);

};
