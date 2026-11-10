import { Schema } from 'mongoose';

/** A user's complaint about an AI assistant answer (Google Play AI-generated content policy). */
const AiReportSchema = new Schema(
	{
		/** Reporter, when logged in. */
		memberId: { type: Schema.Types.ObjectId, default: null },

		/** m:<memberId> or ip:<address> — same key the chat rate limiter uses. */
		requester: { type: String, required: true },

		reason: { type: String, enum: ['OFFENSIVE', 'WRONG', 'SPAM', 'OTHER'], required: true },

		comment: { type: String, default: '' },

		question: { type: String, required: true },

		answer: { type: String, required: true },

		/** web | android | ios */
		platform: { type: String, default: 'unknown' },

		status: { type: String, enum: ['NEW', 'REVIEWED'], default: 'NEW' },
	},
	{ timestamps: true, collection: 'ai_reports' },
);

AiReportSchema.index({ status: 1, createdAt: -1 });

export default AiReportSchema;
