import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { NotificationInput, NotificationInquiry, NotificationReadInput } from "../../libs/dto/notification/notification.input";
import { Model, ObjectId } from "mongoose";
import { Direction, Message } from "../../libs/enums/common.enum";
import { Notifications } from "../../libs/dto/notification/notification";
import { T } from "../../libs/types/common";
import { NotificationStatus } from "../../libs/enums/notification.enum";


@Injectable()
export class NotificationService  {
	constructor(@InjectModel('Notification') private readonly notificationModel: Model<Notification>) {}

	public async createNotification(input: NotificationInput): Promise<Notification> {
		try {
			return await this.notificationModel.create(input);
		} catch (err) {
			console.log('Error: NotificationService.createNotification', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	};

	public async getNotifications(receiverId: ObjectId, input: NotificationInquiry): Promise<Notifications> {
		const { page, limit, sort, direction, search } = input;
		const match: T = { receiverId };
		const sortKey = sort ?? 'createdAt';
		const sortDirection = direction ?? Direction.DESC;

		if (search?.status) match.notificationStatus = search.status;
		if (search?.group) match.notificationGroup = search.group;
		if (search?.type) match.notificationType = search.type;

		const result = await this.notificationModel
			.aggregate([
				{ $match: match },
				{ $sort: { [sortKey]: sortDirection } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							{
								$lookup: {
									from: 'members',
									localField: 'authorId',
									foreignField: '_id',
									as: 'authorData',
								},
							},
							{ $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
						unreadCounter: [
							{ $match: { notificationStatus: NotificationStatus.WAIT } },
							{ $count: 'total' },
						],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async markNotificationsRead(receiverId: ObjectId, input?: NotificationReadInput): Promise<boolean> {
		const match: T = { receiverId, notificationStatus: NotificationStatus.WAIT };
		if (input?.ids?.length) match._id = { $in: input.ids };

		await this.notificationModel.updateMany(match, { notificationStatus: NotificationStatus.READ }).exec();
		return true;
	}
}
