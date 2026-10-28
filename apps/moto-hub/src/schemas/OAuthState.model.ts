import { Schema } from 'mongoose';

/**
 * One document per Google login in flight. The browser holds the raw state in
 * a cookie; we keep only its hash, next to the PKCE verifier and the nonce,
 * which never leave the server. The callback deletes the document (single-use)
 * and Mongo drops it after ten minutes if the user never comes back.
 */
const OAuthStateSchema = new Schema(
	{
		stateHash: {
			type: String,
			required: true,
			unique: true,
		},

		codeVerifier: {
			type: String,
			required: true,
		},

		nonce: {
			type: String,
			required: true,
		},

		/** sha256 of a secret only the starting browser tab holds — ties the login to that tab. */
		bindingHash: {
			type: String,
			required: true,
		},

		expiresAt: {
			type: Date,
			required: true,
		},
	},
	{ timestamps: true, collection: 'oauthStates' },
);

OAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default OAuthStateSchema;
