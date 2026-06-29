const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const apiRoutes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { getEnv } = require('./config/env');

const createApp = () => {
	const app = express();
	const env = getEnv();

	app.disable('x-powered-by');

	app.use(express.json({ limit: '1mb' }));
	app.use(express.urlencoded({ extended: false }));

	app.use(
		cors({
			origin: (origin, cb) => {
				// allow same-origin / curl / server-to-server
				if (!origin) return cb(null, true);

				if (!env.corsOrigins) {
					// permissive in dev by default
					return cb(null, true);
				}

				return cb(null, env.corsOrigins.includes(origin));
			},
			credentials: true,
		})
	);

	if (env.nodeEnv !== 'production') {
		app.use(morgan('dev'));
	}

	app.get('/', (req, res) => {
		res.json({
			name: 'AgriSolar API',
			status: 'ok',
			apiBase: '/api',
		});
	});

	app.use('/api', apiRoutes);

	app.use(notFound);
	app.use(errorHandler);

	return app;
};

module.exports = {
	createApp,
};
