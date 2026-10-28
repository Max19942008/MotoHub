import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import * as crypto from 'crypto';
import { AuthService } from '../auth/auth.service';
import { AuthTokens, Member } from '../../libs/dto/member/member';
import { MemberAuthType, MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { GoogleOAuthClient, GoogleIdentity } from './google-oauth.client';
import { GoogleAuthConfig, LOGIN_CODE_TTL_MS, OAUTH_STATE_TTL_MS } from './google-auth.config';
import { GoogleLoginError, GoogleLoginFailure } from './google-login.error';
import { pkceChallenge, randomToken, safeEqual, sha256Hex } from './oauth-crypto';

interface CallbackInput {
	code?: string;
	state?: string;
	cookieState?: string;
	error?: string;
}

const DUPLICATE_KEY = 11000;
const NICK_ATTEMPTS = 3;

/**
 * Runs a Google login from start to finish. Google only answers "who is this?";
 * from that point on the member gets the very same token pair as a password
 * login, so guards, refresh and logout need no changes.
 */
@Injectable()
export class GoogleAuthService {
	constructor(
		private readonly googleClient: GoogleOAuthClient,
		private readonly authService: AuthService,
		@InjectModel('OAuthState') private readonly oauthStateModel: Model<T>,
		@InjectModel('LoginCode') private readonly loginCodeModel: Model<T>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}

	/** Mints the per-login secrets, keeps them server-side and returns where to send the browser. */
	public async startFlow(config: GoogleAuthConfig, bindingHash: string): Promise<{ state: string; authUrl: string }> {
		const state = randomToken();
		const nonce = randomToken();
		const codeVerifier = randomToken();

		await this.oauthStateModel.create({
			stateHash: sha256Hex(state),
			codeVerifier: codeVerifier,
			nonce: nonce,
			bindingHash: bindingHash,
			expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
		});

		const authUrl = this.googleClient.buildAuthUrl(config, {
			state: state,
			nonce: nonce,
			codeChallenge: pkceChallenge(codeVerifier),
		});
		return { state, authUrl };
	}

	/**
	 * Google sent the browser back. The state must match the cookie of the
	 * browser that started the login, and its server-side record is consumed
	 * atomically, so the same callback can never be replayed.
	 */
	public async finishFlow(config: GoogleAuthConfig, input: CallbackInput): Promise<string> {
		if (input.error) throw new GoogleLoginError(GoogleLoginFailure.CANCELLED, `google returned "${input.error}"`);
		if (!input.code || !input.state || !input.cookieState) {
			throw new GoogleLoginError(GoogleLoginFailure.FAILED, 'callback is missing code, state or state cookie');
		}
		if (!safeEqual(input.state, input.cookieState)) {
			throw new GoogleLoginError(GoogleLoginFailure.FAILED, 'state does not match the cookie');
		}

		const flow = await this.oauthStateModel.findOneAndDelete({ stateHash: sha256Hex(input.state) }).lean().exec();
		if (!flow || new Date(flow.expiresAt).getTime() < Date.now()) {
			throw new GoogleLoginError(GoogleLoginFailure.FAILED, 'state is unknown, used or expired');
		}

		const idToken = await this.googleClient.exchangeCode(config, input.code, flow.codeVerifier);
		const identity = await this.googleClient.verifyIdToken(config, idToken, flow.nonce);
		const member = await this.findOrCreateMember(identity);

		return await this.issueLoginCode(member._id, flow.bindingHash);
	}

	/**
	 * Last hop: the frontend trades its one-time code for our own access + refresh
	 * pair. The code alone is not enough — the tab must also present the binding
	 * secret it created before going to Google. A code sent to someone else in a
	 * link is therefore useless to them, and it is burned on the first attempt.
	 */
	public async exchangeLoginCode(code: string, binding: string): Promise<AuthTokens> {
		if (!code || !binding) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

		const stored = await this.loginCodeModel.findOneAndDelete({ codeHash: sha256Hex(code) }).lean().exec();
		if (!stored || new Date(stored.expiresAt).getTime() < Date.now()) {
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}
		if (!safeEqual(sha256Hex(binding), stored.bindingHash)) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

		const member = await this.memberModel.findById(stored.memberId).exec();
		if (!member || member.memberStatus === MemberStatus.DELETE) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		if (member.memberStatus === MemberStatus.BLOCK) throw new UnauthorizedException(Message.BLOCKED_USER);

		return await this.authService.issueTokenPair(member);
	}

	/**
	 * Members are linked by Google's `sub` only — an email can move between
	 * accounts over time, so it is neither requested nor stored. A deleted
	 * member gives up its googleId, so the same person can start over.
	 */
	private async findOrCreateMember(identity: GoogleIdentity): Promise<Member> {
		const existing = await this.memberModel.findOne({ googleId: identity.sub }).exec();

		if (existing?.memberStatus === MemberStatus.BLOCK) {
			throw new GoogleLoginError(GoogleLoginFailure.BLOCKED, 'member is blocked');
		}
		if (existing && existing.memberStatus !== MemberStatus.DELETE) return existing;
		if (existing) await this.memberModel.updateOne({ _id: existing._id }, { $unset: { googleId: 1 } }).exec();

		return await this.createMember(identity);
	}

	private async createMember(identity: GoogleIdentity): Promise<Member> {
		for (let attempt = 0; attempt < NICK_ATTEMPTS; attempt++) {
			try {
				return await this.memberModel.create({
					memberType: MemberType.USER,
					memberAuthType: MemberAuthType.GOOGLE,
					memberNick: buildNick(identity.givenName ?? identity.name),
					memberFullName: identity.name,
					googleId: identity.sub,
				});
			} catch (err: any) {
				if (err?.code !== DUPLICATE_KEY) throw err;

				/** Two first logins raced and the other one already created the member. */
				if (err?.keyPattern?.googleId) {
					const winner = await this.memberModel.findOne({ googleId: identity.sub }).exec();
					if (winner) return winner;
				}
				/** Otherwise the random nick suffix collided — try a new one. */
			}
		}
		throw new GoogleLoginError(GoogleLoginFailure.FAILED, 'could not allocate a unique nick');
	}

	private async issueLoginCode(memberId: ObjectId, bindingHash: string): Promise<string> {
		const code = randomToken();
		await this.loginCodeModel.create({
			codeHash: sha256Hex(code),
			memberId: memberId,
			bindingHash: bindingHash,
			expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
		});
		return code;
	}
}

/** "Max Rahim" → "max_3f9a1c": readable, within the 3–20 limit and the same charset a typed nick uses. */
const buildNick = (name?: string): string => {
	const base =
		(name ?? '')
			.normalize('NFKD')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 12) || 'rider';
	return `${base}_${crypto.randomBytes(3).toString('hex')}`;
};
