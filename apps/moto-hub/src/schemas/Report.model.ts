import { Schema } from 'mongoose';
import { ReportGroup, ReportReason, ReportStatus } from '../libs/enums/report.enum';

const ReportSchema = new Schema(
	{
		reportGroup: {
			type: String,
			enum: ReportGroup,
			required: true,
		},

		reportReason: {
			type: String,
			enum: ReportReason,
			required: true,
		},

		reportStatus: {
			type: String,
			enum: ReportStatus,
			default: ReportStatus.PENDING,
		},

		reportDesc: {
			type: String,
		},

		/** The reported document — a member, listing, part, article or comment. */
		reportRefId: {
			type: Schema.Types.ObjectId,
			required: true,
			index: true,
		},

		reporterId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		reviewedAt: {
			type: Date,
		},

		reviewedBy: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'reports' },
);

/** One report per member per target — re-reporting the same thing is a no-op. */
ReportSchema.index({ reporterId: 1, reportRefId: 1 }, { unique: true });

export default ReportSchema;
