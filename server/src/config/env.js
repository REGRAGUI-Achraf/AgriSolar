const dotenv = require('dotenv');

dotenv.config();

const toInt = (value, fallback) => {
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : fallback;
};

const getEnv = () => {
	const nodeEnv = process.env.NODE_ENV || 'development';
	return {
		nodeEnv,
		port: toInt(process.env.PORT, 3000),
		// comma-separated list of allowed origins (optional)
		corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : null,
	};
};

module.exports = {
	getEnv,
};
