const jwtVariable = require('../../variables/jwt');
const db = require("../models");
const Customer = db.customer;
const authMethod = require('../middlewares/auth.method');

exports.isAuth = async (req, res, next) => {
	try {
		const accessTokenFromHeader = req.headers.authorization.split(' ');
		if (!accessTokenFromHeader[1]) {
			return res.status(401).send({ error: 'Access token not found.' });
		}

		const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;
		const verified = await authMethod.verifyToken(accessTokenFromHeader[1], accessTokenSecret);
		if (!verified) {
			return res.status(401).send({ error: 'Invalid access token.' });
		}

		res.send(verified.payload);
		next();
	} catch (error) {
		console.error(error);
		return res.status(500).send({ error: 'An error occurred while processing your request.' });
	}
};

async function findCustomerByEmail(email) {
	const customer = await Customer.findOne({ email });
	return customer;
}

exports.checkAuth = async (req) => {
	const accessTokenFromHeader = req.headers.authorization.split(' ');
	if (!accessTokenFromHeader[1]) {
		return null;
	}

	const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;
	const verified = await authMethod.verifyToken(accessTokenFromHeader[1], accessTokenSecret);
	if (!verified) {
		return null;
	}

	return verified.payload
}
