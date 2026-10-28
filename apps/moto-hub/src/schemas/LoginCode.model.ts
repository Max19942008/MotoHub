import { Schema } from 'mongoose';

/**
 * Google's callback lands on the backend, but the tokens are needed on the
 * frontend — and tokens never ride in a URL. The frontend receives a one-time
 * code instead, stored here only as a hash, valid for a minute and consumed on
 * first use.
 */
const LoginCodeSchema = new Schema(
	{
		codeHash: {
			type: String,
			required: true,
			unique: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
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
	{ timestamps: true, collection: 'loginCodes' },
);

LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default LoginCodeSchema;
