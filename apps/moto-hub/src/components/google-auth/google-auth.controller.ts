import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GoogleAuthService } from './google-auth.service';
import { getGoogleAuthConfig } from './google-auth.config';
import { GoogleLoginError, GoogleLoginFailure } from './google-login.error';
import { clearStateCookie, readStateCookie, setStateCookie } from './oauth-cookie';
import { isSha256Hex } from './oauth-crypto';

/** Express parses ?code=a&code=b into an array — only a single plain string is accepted. */
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/**
 * The two browser-facing hops of Google sign-in. They are plain HTTP redirects,
 * not GraphQL: the browser has to navigate here so the state cookie can be set
 * and read on the backend's own domain.
 */
@Controller('auth/google')
export class GoogleAuthController {
	private readonly logger = new Logger('GoogleAuthController');

	constructor(private readonly googleAuthService: GoogleAuthService) {}

	/**
	 * "Continue with Google" navigates here with ?binding=<sha256 of a tab-only secret>;
	 * the browser then leaves for Google's consent screen.
	 */
	@Get()
	public async start(@Query('binding') binding: unknown, @Res() res: Response): Promise<void> {
		const config = getGoogleAuthConfig();
		if (!config) {
			res.status(503).send('Google login is not configured.');
			return;
		}
		if (!isSha256Hex(binding)) {
			res.status(400).send('Bad Request');
			return;
		}

		const { state, authUrl } = await this.googleAuthService.startFlow(config, binding);
		setStateCookie(res, state);
		res.set('Cache-Control', 'no-store');
		res.redirect(302, authUrl);
	}

	/**
	 * Google sends the browser back here. Whatever happens, the state cookie is
	 * cleared and the browser goes to the frontend with either a one-time login
	 * code or a short reason — never a token, never an internal error. Both ride
	 * in the URL fragment, which browsers never send to a server or in a Referer.
	 */
	@Get('callback')
	public async callback(@Query() query: Record<string, unknown>, @Req() req: Request, @Res() res: Response): Promise<void> {
		const config = getGoogleAuthConfig();
		if (!config) {
			res.status(503).send('Google login is not configured.');
			return;
		}

		const cookieState = readStateCookie(req);
		clearStateCookie(res);
		res.set('Cache-Control', 'no-store');

		try {
			const loginCode = await this.googleAuthService.finishFlow(config, {
				code: asString(query.code),
				state: asString(query.state),
				cookieState: cookieState,
				error: asString(query.error),
			});
			res.redirect(302, `${config.frontendUrl}/auth/google#code=${encodeURIComponent(loginCode)}`);
		} catch (err: any) {
			const reason = err instanceof GoogleLoginError ? err.reason : GoogleLoginFailure.FAILED;
			this.logger.warn(`Google login rejected (${reason}): ${err?.message}`);
			res.redirect(302, `${config.frontendUrl}/auth/google#error=${reason}`);
		}
	}
}
