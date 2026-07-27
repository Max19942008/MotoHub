import { Schema } from 'mongoose';

/**
 * Member-to-member block. One-directional by intent: the blocker stops seeing
 * the blocked member's listings, parts, articles and comments.
 */
const BlockSchema = new Schema(
	{
		blockerId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
			index: true,
		},

		blockedId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'blocks' },
);

BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export default BlockSchema;
