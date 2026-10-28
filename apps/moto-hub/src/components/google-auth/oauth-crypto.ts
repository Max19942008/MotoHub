import * as crypto from 'crypto';

/** 32 random bytes as hex: 64 URL-safe characters, also a valid PKCE verifier (43–128 chars). */
export const randomToken = (): string => crypto.randomBytes(32).toString('hex');

export const sha256Hex = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

/** PKCE S256: BASE64URL(SHA256(verifier)). Google gets the challenge, the verifier stays with us. */
export const pkceChallenge = (codeVerifier: string): string =>
	crypto.createHash('sha256').update(codeVerifier).digest('base64url');

/** Constant-time comparison, so the time a mismatch takes leaks nothing about the secret. */
export const safeEqual = (a: string, b: string): boolean => {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/** The browser binding arrives as a SHA-256 hex digest; anything else is rejected before it reaches the DB. */
export const isSha256Hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export const decodeJwtSegment = (segment: string): Record<string, any> =>
	JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
