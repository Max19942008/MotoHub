/** What the frontend is told when a Google login does not go through. Never more detail than this. */
export enum GoogleLoginFailure {
	CANCELLED = 'cancelled',
	BLOCKED = 'blocked',
	FAILED = 'failed',
}

/** `message` is for our logs only and must never contain a code, token or secret. */
export class GoogleLoginError extends Error {
	constructor(
		public readonly reason: GoogleLoginFailure,
		message: string,
	) {
		super(message);
	}
}
