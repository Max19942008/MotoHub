import type { CookieOptions, Request, Response } from 'express';
import { OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_MS } from './google-auth.config';

/**
 * The state cookie binds a login to the browser that started it. httpOnly keeps
 * scripts away from it, SameSite=Lax still lets it ride on Google's top-level
 * redirect back to us, and the path keeps it off every other API request.
 */
const cookieOptions = (): CookieOptions => ({
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax',
	path: '/auth/google',
});

export const setStateCookie = (res: Response, state: string): void => {
	res.cookie(OAUTH_STATE_COOKIE, state, { ...cookieOptions(), maxAge: OAUTH_STATE_TTL_MS });
};

export const clearStateCookie = (res: Response): void => {
	res.clearCookie(OAUTH_STATE_COOKIE, cookieOptions());
};

/** The app has no cookie-parser and this is the only cookie it reads, so it is parsed by hand. */
export const readStateCookie = (req: Request): string | undefined => {
	const header = req.headers.cookie;
	if (!header) return undefined;

	for (const pair of header.split(';')) {
		const separator = pair.indexOf('=');
		if (separator === -1 || pair.slice(0, separator).trim() !== OAUTH_STATE_COOKIE) continue;
		try {
			return decodeURIComponent(pair.slice(separator + 1).trim());
		} catch {
			return undefined;
		}
	}
	return undefined;
};
