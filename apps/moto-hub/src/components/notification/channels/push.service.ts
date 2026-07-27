import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { T } from '../../../libs/types/common';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo accepts at most 100 messages per request. */
const CHUNK_SIZE = 100;

/**
 * Delivers push notifications through the Expo Push API, which fronts both APNs
 * and FCM, so the server needs no Apple/Google credentials of its own.
 *
 * Optional env:
 *   EXPO_ACCESS_TOKEN - only needed if push security is enabled in the Expo project
 */
@Injectable()
export class PushService {
	private readonly logger = new Logger('PushService');

	constructor(
		private readonly httpService: HttpService,
		@InjectModel('DeviceToken') private readonly deviceTokenModel: Model<T>,
	) {}

	/**
	 * Best-effort: a failed push must never break the action that triggered it,
	 * so everything here swallows its errors and only logs.
	 */
	public async sendToMember(receiverId: ObjectId, title: string, body?: string, data?: T): Promise<boolean> {
		try {
			const devices = await this.deviceTokenModel.find({ memberId: receiverId }).select('deviceToken').lean().exec();
			if (!devices.length) return false;

			const tokens = devices.map((d) => d.deviceToken);
			for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
				await this.sendChunk(tokens.slice(i, i + CHUNK_SIZE), title, body, data);
			}
			return true;
		} catch (err: any) {
			this.logger.error(`sendToMember failed: ${err.message}`);
			return false;
		}
	}

	private async sendChunk(tokens: string[], title: string, body?: string, data?: T): Promise<void> {
		const messages = tokens.map((to) => ({
			to,
			title,
			body: body ?? '',
			data: data ?? {},
			sound: 'default',
		}));

		const headers: T = { 'Content-Type': 'application/json' };
		if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

		const response = await firstValueFrom(
			this.httpService.post(EXPO_PUSH_URL, messages, { headers, timeout: 15000 }),
		);

		await this.pruneDeadTokens(tokens, response?.data?.data);
	}

	/**
	 * Expo answers per message, in the order sent. A DeviceNotRegistered ticket
	 * means the app was uninstalled — keeping that token would just accumulate
	 * failures, so it is dropped.
	 */
	private async pruneDeadTokens(tokens: string[], tickets: T[]): Promise<void> {
		if (!Array.isArray(tickets)) return;

		const dead = tickets
			.map((ticket, index) => (ticket?.details?.error === 'DeviceNotRegistered' ? tokens[index] : null))
			.filter(Boolean);

		if (!dead.length) return;
		await this.deviceTokenModel.deleteMany({ deviceToken: { $in: dead } }).exec();
		this.logger.verbose(`pruned ${dead.length} unregistered device token(s)`);
	}

	/** Called on login / app start. Re-registering an existing token re-points it. */
	public async registerDevice(memberId: ObjectId, deviceToken: string, devicePlatform: string): Promise<boolean> {
		await this.deviceTokenModel
			.findOneAndUpdate(
				{ deviceToken: deviceToken },
				{ deviceToken, devicePlatform, memberId, lastSeenAt: new Date() },
				{ upsert: true, new: true },
			)
			.exec();
		return true;
	}

	/** Called on logout so the next owner of the device does not inherit the alerts. */
	public async unregisterDevice(memberId: ObjectId, deviceToken: string): Promise<boolean> {
		await this.deviceTokenModel.deleteOne({ deviceToken: deviceToken, memberId: memberId }).exec();
		return true;
	}
}
