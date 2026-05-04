// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
	const status = typeof err?.status === 'number' ? err.status : 500;
	const message = typeof err?.message === 'string' && err.message.trim() ? err.message : 'Internal server error';

	// Avoid leaking stack traces in production.
	const payload = {
		message,
	};

	if ((process.env.NODE_ENV || 'development') !== 'production') {
		payload.stack = err?.stack;
	}

	res.status(status).json(payload);
};

module.exports = errorHandler;
