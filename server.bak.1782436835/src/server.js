const { createApp } = require('./app');
const { getEnv } = require('./config/env');

const env = getEnv();
const app = createApp();

const server = app.listen(env.port, () => {
	// eslint-disable-next-line no-console
	console.log(`AgriSolar API listening on http://localhost:${env.port}`);
});

server.on('error', (err) => {
	if (err?.code === 'EADDRINUSE') {
		// eslint-disable-next-line no-console
		console.error(`Port ${env.port} déjà utilisé. Stoppe le process existant ou change PORT.`);
		process.exit(1);
	}
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});
