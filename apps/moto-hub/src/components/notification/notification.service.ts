import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { NotificationDeleteInput, NotificationInput, NotificationInquiry, NotificationReadInput } from "../../libs/dto/notification/notification.input";
import { Model, ObjectId } from "mongoose";
import { Direction, Message } from "../../libs/enums/common.enum";
import { Notification, Notifications } from "../../libs/dto/notification/notification";
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
							// include title/desc directly
							{
								$project: {
									notificationType: 1,
									notificationStatus: 1,
									notificationGroup: 1,
									notificationTitle: 1,
									notificationDesc: 1,
									authorId: 1,
									receiverId: 1,
									propertyId: 1,
									articleId: 1,
									createdAt: 1,
									updatedAt: 1,
									readAt: 1,
									authorData: 1,
								},
							},
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
		if (input?._id?.length) match._id = { $in: input._id };

		await this.notificationModel
			.updateMany(match, { notificationStatus: NotificationStatus.READ, readAt: new Date() })
			.exec();
		return true;
	};

	public async deleteNotification(receiverId: ObjectId, input?: NotificationDeleteInput): Promise<boolean> {
		const match: T = { receiverId, _id: input?._id };
		await this.notificationModel.findByIdAndDelete(match).exec();
		return true;
	};


}
