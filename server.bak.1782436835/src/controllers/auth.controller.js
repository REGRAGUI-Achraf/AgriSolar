const authService = require('../services/auth.service');
const { requireString } = require('../utils/validators');

const login = async (req, res, next) => {
	try {
		const email = requireString(req.body?.email, 'email').toLowerCase();
		const password = requireString(req.body?.password, 'password');
		const result = await authService.login({ email, password });

		if (!result) {
			const err = new Error('Identifiants invalides.');
			err.status = 401;
			throw err;
		}

		res.json(result);
	} catch (err) {
		next(err);
	}
};

const me = async (req, res, next) => {
	try {
		if (!req.auth?.userId) {
			const err = new Error('Non authentifié.');
			err.status = 401;
			throw err;
		}

		const user = await authService.getUserById(req.auth.userId);
		if (!user) {
			const err = new Error('Utilisateur introuvable.');
			err.status = 404;
			throw err;
		}

		res.json({ user });
	} catch (err) {
		next(err);
	}
};

module.exports = {
	login,
	me,
};