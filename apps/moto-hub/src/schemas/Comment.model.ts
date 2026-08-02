import { Schema } from 'mongoose';
import { CommentGroup, CommentStatus } from '../libs/enums/comment.enum';

const CommentSchema = new Schema(
	{
		commentStatus: {
			type: String,
			enum: CommentStatus,
			default: CommentStatus.ACTIVE,
		},

		commentGroup: {
			type: String,
			enum: CommentGroup,
			required: true,
		},

		commentContent: {
			type: String,
			required: true,
		},

		commentRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
	},
	{ timestamps: true, collection: 'comments' },
);

/**
 * The collection had no index at all beyond _id. Comments are loaded on every
 * property, part and article detail page, always by the same shape:
 * match {commentRefId, commentStatus: ACTIVE}, sort createdAt DESC.
 */
CommentSchema.index({ commentRefId: 1, commentStatus: 1, createdAt: -1 });

export default CommentSchema;
