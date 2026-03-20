const jwtVariable = require('../../variables/jwt');
const authMethod = require('../../middlewares/auth.method');

/**
 * Lấy token từ header
 */
const getTokenFromHeader = (req) => {
    const accessTokenFromHeader = req.headers.authorization.split(' ');
    return accessTokenFromHeader[1];
};

/**
 * Verify access token
 */
const verifyAccessToken = async (token) => {
    const accessTokenSecret =
        process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;

    const verified = await authMethod.verifyToken(token, accessTokenSecret);
    return verified;
};

/**
 * Check auth (giữ nguyên logic cũ)
 */
const checkAuth = async (req) => {
    const accessTokenFromHeader = req.headers.authorization.split(' ');
    if (!accessTokenFromHeader[1]) {
        return null;
    }

    const accessTokenSecret =
        process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;

    const verified = await authMethod.verifyToken(
        accessTokenFromHeader[1],
        accessTokenSecret
    );

    if (!verified) {
        return null;
    }

    return verified.payload;
};

module.exports = {
    getTokenFromHeader,
    verifyAccessToken,
    checkAuth,
};