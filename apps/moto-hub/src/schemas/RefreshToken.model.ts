import { Schema } from 'mongoose';

/**
 * Refresh tokens are stored hashed (never in clear) so a database leak cannot
 * be replayed as a login. Rotation deletes the presented token and issues a new
 * one, which makes logout and "revoke every session" possible — something a
 * stateless JWT cannot do.
 */
const RefreshTokenSchema = new Schema(
	{
		tokenHash: {
			type: String,
			required: true,
			unique: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
			index: true,
		},

		expiresAt: {
			type: Date,
			required: true,
		},
	},
	{ timestamps: true, collection: 'refreshTokens' },
);

/** Mongo drops the document by itself once expiresAt passes. */
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default RefreshTokenSchema;
