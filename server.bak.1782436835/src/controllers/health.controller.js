const healthCheck = (req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptimeSeconds: Math.round(process.uptime()),
	});
};

module.exports = {
	healthCheck,
};
