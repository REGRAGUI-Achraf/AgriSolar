const authService = require('../services/auth.service');

const getBearerToken = (req) => {
	const header = req.headers.authorization || req.headers.Authorization;
	if (!header || typeof header !== 'string') return null;
	const [scheme, token] = header.split(' ');
	if (scheme !== 'Bearer' || !token) return null;
	return token;
};

const requireAuth = async (req, res, next) => {
	try {
		const token = getBearerToken(req);
		const payload = authService.verifyToken(token);
		if (!payload) {
			const err = new Error('Authentification requise.');
			err.status = 401;
			throw err;
		}

		req.auth = {
			userId: payload.sub,
			email: payload.email,
			role: payload.role,
			issuedAt: payload.iat,
			expiresAt: payload.exp,
		};

		next();
	} catch (err) {
		next(err);
	}
};

const requireRole = (...roles) => async (req, res, next) => {
	try {
		const allowedRoles = new Set(roles.flat().map((role) => String(role).toUpperCase()));
		if (!req.auth?.role || !allowedRoles.has(String(req.auth.role).toUpperCase())) {
			const err = new Error('Accès interdit.');
			err.status = 403;
			throw err;
		}
		next();
	} catch (err) {
		next(err);
	}
};

module.exports = {
	requireAuth,
	requireRole,
};