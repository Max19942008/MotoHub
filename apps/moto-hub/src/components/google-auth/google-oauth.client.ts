import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
	GOOGLE_AUTH_ENDPOINT,
	GOOGLE_DISCOVERY_URL,
	GOOGLE_ISSUERS,
	GOOGLE_SCOPES,
	GOOGLE_TOKEN_ENDPOINT,
	GoogleAuthConfig,
} from './google-auth.config';
import { decodeJwtSegment, safeEqual } from './oauth-crypto';

export interface GoogleIdentity {
	sub: string;
	name?: string;
	givenName?: string;
}

interface AuthUrlInput {
	state: string;
	nonce: string;
	codeChallenge: string;
}

interface Jwk {
	kid: string;
	kty: string;
	n: string;
	e: string;
}

const HTTP_TIMEOUT_MS = 10_000;
const JWKS_CACHE_MS = 60 * 60 * 1000;

/**
 * Everything that speaks Google's protocol lives here and nowhere else: the
 * consent URL, the server-to-server code exchange and ID-token verification.
 * It knows nothing about members or about our own tokens.
 */
@Injectable()
export class GoogleOAuthClient {
	private jwks: Jwk[] = [];
	private jwksFetchedAt = 0;

	constructor(private readonly httpService: HttpService) {}

	/** Front channel: only public values go into this URL — never the secret, never the verifier. */
	public buildAuthUrl(config: GoogleAuthConfig, input: AuthUrlInput): string {
		const params = new URLSearchParams({
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			response_type: 'code',
			scope: GOOGLE_SCOPES,
			state: input.state,
			nonce: input.nonce,
			code_challenge: input.codeChallenge,
			code_challenge_method: 'S256',
			prompt: 'select_account',
		});
		return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
	}

	/**
	 * Back channel: the browser never sees this request, the client secret or
	 * the reply. On failure only Google's short error code is kept — the axios
	 * error itself carries the request body, secret included.
	 */
	public async exchangeCode(config: GoogleAuthConfig, code: string, codeVerifier: string): Promise<string> {
		const body = new URLSearchParams({
			code: code,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: config.redirectUri,
			grant_type: 'authorization_code',
			code_verifier: codeVerifier,
		});

		try {
			const { data } = await firstValueFrom(
				this.httpService.post(GOOGLE_TOKEN_ENDPOINT, body.toString(), {
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					timeout: HTTP_TIMEOUT_MS,
				}),
			);
			if (typeof data?.id_token !== 'string') throw new Error('no id_token in the response');
			return data.id_token;
		} catch (err: any) {
			throw new Error(`token exchange failed: ${err?.response?.data?.error ?? err?.message ?? 'unknown'}`);
		}
	}

	/**
	 * The id_token is trusted only after its RS256 signature checks out against
	 * Google's published keys and every claim that binds it to this login —
	 * issuer, audience, expiry and our nonce — matches.
	 */
	public async verifyIdToken(config: GoogleAuthConfig, idToken: string, expectedNonce: string): Promise<GoogleIdentity> {
		const parts = idToken.split('.');
		if (parts.length !== 3) throw new Error('malformed id_token');
		const [encodedHeader, encodedPayload, encodedSignature] = parts;

		const header = decodeJwtSegment(encodedHeader);
		if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('unexpected id_token header');

		const jwk = await this.findKey(header.kid);
		const publicKey = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
		const isSigned = crypto.verify(
			'RSA-SHA256',
			Buffer.from(`${encodedHeader}.${encodedPayload}`),
			publicKey,
			Buffer.from(encodedSignature, 'base64url'),
		);
		if (!isSigned) throw new Error('id_token signature mismatch');

		const claims = decodeJwtSegment(encodedPayload);
		if (!GOOGLE_ISSUERS.includes(claims.iss)) throw new Error('id_token issuer mismatch');
		if (claims.aud !== config.clientId) throw new Error('id_token audience mismatch');
		if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) throw new Error('id_token expired');
		if (typeof claims.nonce !== 'string' || !safeEqual(claims.nonce, expectedNonce)) throw new Error('id_token nonce mismatch');
		if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('id_token has no subject');

		return { sub: claims.sub, name: claims.name, givenName: claims.given_name };
	}

	/** Google rotates its signing keys, so an unknown kid earns exactly one fresh download. */
	private async findKey(kid: string): Promise<Jwk> {
		const isFresh = Date.now() - this.jwksFetchedAt < JWKS_CACHE_MS;
		const cached = isFresh ? this.jwks.find((key) => key.kid === kid) : undefined;
		if (cached) return cached;

		await this.refreshJwks();
		const fresh = this.jwks.find((key) => key.kid === kid);
		if (!fresh) throw new Error('id_token signed with an unknown key');
		return fresh;
	}

	/** The key-set URL is taken from Google's discovery document rather than hard-coded. */
	private async refreshJwks(): Promise<void> {
		const { data: discovery } = await firstValueFrom(
			this.httpService.get(GOOGLE_DISCOVERY_URL, { timeout: HTTP_TIMEOUT_MS }),
		);
		const jwksUri = discovery?.jwks_uri;
		if (typeof jwksUri !== 'string' || !jwksUri.startsWith('https://')) throw new Error('discovery has no jwks_uri');

		const { data } = await firstValueFrom(this.httpService.get(jwksUri, { timeout: HTTP_TIMEOUT_MS }));
		if (!Array.isArray(data?.keys)) throw new Error('jwks has no keys');

		this.jwks = data.keys;
		this.jwksFetchedAt = Date.now();
	}
}
