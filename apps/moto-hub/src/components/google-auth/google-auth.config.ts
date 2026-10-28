/**
 * Google sign-in settings. Read at call time, not at import time, so a value
 * that is missing from .env can never be baked in as the string "undefined".
 * If anything is missing Google login is switched off (503) and the rest of
 * the API keeps running.
 */
export interface GoogleAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	frontendUrl: string;
}

export const getGoogleAuthConfig = (): GoogleAuthConfig | null => {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	const redirectUri = process.env.GOOGLE_REDIRECT_URI;
	const frontendUrl = process.env.FRONTEND_URL;

	if (!clientId || !clientSecret || !redirectUri || !frontendUrl) return null;
	return { clientId, clientSecret, redirectUri, frontendUrl: frontendUrl.replace(/\/+$/, '') };
};

/** Endpoints and issuers as published in Google's OpenID Connect reference. */
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration';
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Name only — no email. We link on `sub`, so we ask for nothing we would not use. */
export const GOOGLE_SCOPES = 'openid profile';

/** How long a started login may sit on Google's consent screen. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/** The frontend trades its login code right away — a minute is plenty. */
export const LOGIN_CODE_TTL_MS = 60 * 1000;

export const OAUTH_STATE_COOKIE = 'motohub_oauth_state';
