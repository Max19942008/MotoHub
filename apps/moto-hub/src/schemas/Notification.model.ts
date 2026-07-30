import { Schema } from 'mongoose';
import { NotificationGroup, NotificationStatus, NotificationType } from '../libs/enums/notification.enum';

const NotificationSchema = new Schema(
	{
		notificationType: {
			type: String,
			enum: NotificationType,
			required: true,
		},

		notificationStatus: {
			type: String,
			enum: NotificationStatus,
			default: NotificationStatus.WAIT,
		},

		notificationGroup: {
			type: String,
			enum: NotificationGroup,
			required: true,
		},

		notificationTitle: {
			type: String,
			required: true,
		},

		notificationDesc: {
			type: String,
		},

		authorId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		receiverId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		propertyId: {
			type: Schema.Types.ObjectId,
			ref: 'Property',
		},

	articleId: {
			type: Schema.Types.ObjectId,
			ref: 'BoardArticle',
		},

		partId: {
			type: Schema.Types.ObjectId,
			ref: 'Part',
		},

		readAt: {
			type: Date,
		},
	},
	{ timestamps: true, collection: 'notifications' },
);

/**
 * The bell in the navbar polls every 30 seconds for every signed-in member, so
 * this is the hottest read in the app. Without an index it was a collection
 * scan per poll.
 */
NotificationSchema.index({ receiverId: 1, createdAt: -1 });
NotificationSchema.index({ receiverId: 1, notificationStatus: 1 });

export default NotificationSchema;
