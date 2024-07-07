const Helper = require('../helper');

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return Helper.send_res(res, { message: "Token non fourni" }, 403);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = Helper.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return Helper.send_res(res, { message: "Token invalide" }, 403);
    }
};

module.exports = authenticate;