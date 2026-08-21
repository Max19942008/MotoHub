import { Schema } from 'mongoose';

/**
 * A buyer telling the dealer "I want this bike".
 *
 * Unlike a like, this reaches a human the moment it is filed — mail and Telegram
 * both go out — so it is recorded rather than toggled. An interest cannot be
 * unsent, and the unique index turns a second tap into a no-op instead of a
 * second message at two in the morning.
 *
 * The row is also what the detail page reads back to tell a returning buyer they
 * have already asked.
 */
const InterestSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		propertyId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Property',
		},
	},
	{ timestamps: true, collection: 'interests' },
);

/** Both the duplicate guard and the lookup behind `meInterested`. */
InterestSchema.index({ memberId: 1, propertyId: 1 }, { unique: true });

export default InterestSchema;
