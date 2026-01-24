const jwtVariable = require('../../variables/jwt');
const db = require("../models");
const Customer = db.customer;
const authMethod = require('./auth.method');

exports.isAuth = async (req, res, next) => {
	try {
		if (!req.headers.authorization) {
			return res.status(401).json({ error: "Authorization header missing" });
		}

		const token = req.headers.authorization.split(' ')[1];
		if (!token) {
			return res.status(401).send({ error: 'Access token not found.' });
		}

		const secret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;

		const decoded = await authMethod.verifyToken(token, secret);
		if (!decoded) {
			return res.status(401).send({ error: 'Invalid access token.' });
		}

		// Check if customer exists by email
		const customer = await findCustomerByEmail(decoded.payload.email);
		if (!customer) {
			return res.status(401).send({ error: `Customer not found with email ${decoded.payload.email}.` });
		}

		req.user = decoded.payload;
		next();
	} catch (error) {
		console.error(error);
		return res.status(500).send({ error: 'An error occurred while processing your request.' });
	}
};

async function findCustomerByEmail(email) {
	return await Customer.findOne({ email });
}

exports.checkAuth = async(req) => {
	const token = req.headers.authorization.split(' ')[1];
	if (!token) {
		return null;
	}

	// Verify access token
	const secret = process.env.ACCESS_TOKEN_SECRET || jwtVariable.accessTokenSecret;
	const decoded = await authMethod.verifyToken(token, secret);
	if (!decoded) {
		return null;
	}

	return decoded.payload;
}
