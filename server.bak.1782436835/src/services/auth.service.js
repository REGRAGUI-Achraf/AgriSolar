const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { prisma } = require('../config/db');
const { getEnv } = require('../config/env');

const base64UrlEncode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const sign = (payload) => {
	const env = getEnv();
	return crypto.createHmac('sha256', env.authSecret).update(payload).digest('base64url');
};

const createToken = ({ userId, email, role, expiresInSeconds = 60 * 60 * 24 * 7 }) => {
	const now = Math.floor(Date.now() / 1000);
	const payload = {
		sub: userId,
		email,
		role,
		iat: now,
		exp: now + expiresInSeconds,
	};
	const encodedPayload = base64UrlEncode(payload);
	const signature = sign(encodedPayload);
	return `${encodedPayload}.${signature}`;
};

const verifyToken = (token) => {
	if (!token || typeof token !== 'string') return null;
	const [encodedPayload, signature] = token.split('.');
	if (!encodedPayload || !signature) return null;

	const expectedSignature = sign(encodedPayload);
	const safeSignature = Buffer.from(signature);
	const safeExpected = Buffer.from(expectedSignature);
	if (safeSignature.length !== safeExpected.length) return null;
	if (!crypto.timingSafeEqual(safeSignature, safeExpected)) return null;

	try {
		const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
		if (!payload?.sub || !payload?.exp) return null;
		if (Math.floor(Date.now() / 1000) > payload.exp) return null;
		return payload;
	} catch {
		return null;
	}
};

const sanitizeUser = (user) => ({
	id: user.id,
	email: user.email,
	role: user.role,
	fullName: user.fullName,
	isActive: user.isActive,
	lastLoginAt: user.lastLoginAt,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
});

const login = async ({ email, password }) => {
	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			email: true,
			password: true,
			role: true,
			fullName: true,
			isActive: true,
			lastLoginAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user || !user.isActive) return null;

	const isValid = bcrypt.compareSync(password, user.password);
	if (!isValid) return null;

	await prisma.user.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
	});

	const token = createToken({ userId: user.id, email: user.email, role: user.role });
	return { token, user: sanitizeUser(user) };
};

const getUserById = async (id) => {
	const user = await prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			email: true,
			role: true,
			fullName: true,
			isActive: true,
			lastLoginAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});
	return user ? sanitizeUser(user) : null;
};

module.exports = {
	createToken,
	verifyToken,
	login,
	getUserById,
	sanitizeUser,
};