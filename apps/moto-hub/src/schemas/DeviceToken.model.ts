import { Schema } from 'mongoose';
import { DevicePlatform } from '../libs/enums/device.enum';

/**
 * One row per installed app instance. The token is the address push messages are
 * delivered to, so it is unique — reinstalling or switching accounts reassigns
 * the same token to a different member rather than duplicating it.
 */
const DeviceTokenSchema = new Schema(
	{
		deviceToken: {
			type: String,
			required: true,
			unique: true,
		},

		devicePlatform: {
			type: String,
			enum: DevicePlatform,
			required: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
			index: true,
		},

		lastSeenAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true, collection: 'deviceTokens' },
);

export default DeviceTokenSchema;
