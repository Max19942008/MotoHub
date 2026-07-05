import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { NotificationDeleteInput, NotificationInput, NotificationInquiry, NotificationReadInput } from "../../libs/dto/notification/notification.input";
import { Model, ObjectId } from "mongoose";
import { Direction, Message } from "../../libs/enums/common.enum";
import { Notification, Notifications } from "../../libs/dto/notification/notification";
import { Member } from "../../libs/dto/member/member";
import { Property } from "../../libs/dto/property/property";
import { T } from "../../libs/types/common";
import { NotificationGroup, NotificationStatus, NotificationType } from "../../libs/enums/notification.enum";
import { MemberStatus, MemberType } from "../../libs/enums/member.enum";
import { MailService } from "./channels/mail.service";
import { TelegramService } from "./channels/telegram.service";


@Injectable()
export class NotificationService  {
	constructor(
		@InjectModel('Notification') private readonly notificationModel: Model<Notification>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private readonly mailService: MailService,
		private readonly telegramService: TelegramService,
	) {}

	/**
	 * Triggered when a client expresses interest in a motorbike.
	 * Creates an in-app notification for every ADMIN and pushes the same alert
	 * to the admin via Gmail and Telegram.
	 */
	public async notifyAdminsInterest(client: Member, property: Property): Promise<boolean> {
		const admins = await this.memberModel
			.find({ memberType: MemberType.ADMIN, memberStatus: MemberStatus.ACTIVE })
			.select('_id')
			.lean()
			.exec();

		const title = `New interest: ${client?.memberNick ?? 'A client'} is interested in "${property.propertyTitle}"`;
		const desc = `${client?.memberNick ?? 'A client'} (phone: ${client?.memberPhone ?? '-'}) is interested in "${property.propertyTitle}".`;

		// 1) In-app notification for each admin
		for (const admin of admins) {
			await this.createNotification({
				notificationType: NotificationType.INTEREST,
				notificationGroup: NotificationGroup.PROPERTY,
				notificationStatus: NotificationStatus.WAIT,
				notificationTitle: title,
				notificationDesc: desc,
				authorId: client._id,
				receiverId: admin._id as ObjectId,
				propertyId: property._id,
			}).catch((err) => console.log('notifyAdminsInterest in-app err:', err?.message));
		}

		// 2) External channels (Gmail + Telegram) — best-effort, never block the flow
		const apiUrl = (process.env.API_PUBLIC_URL ?? 'http://159.223.61.65:4001').replace(/\/+$/, '');
		const frontUrl = (process.env.FRONTEND_URL ?? 'http://159.223.61.65:4000').replace(/\/+$/, '');
		const dash = (v: any) => (v === undefined || v === null || v === '' ? '-' : v);
		const priceStr = property.propertyPrice != null ? `$${property.propertyPrice.toLocaleString()}` : '-';
		const options =
			[property.propertyBarter ? 'Barter' : null, property.propertyRent ? 'Rent' : null]
				.filter(Boolean)
				.join(', ') || '-';
		const detailLink = `${frontUrl}/property/detail?id=${property._id}`;
		const firstImage = property.propertyImages?.[0];
		const imageUrl = firstImage ? `${apiUrl}/${String(firstImage).replace(/^\/+/, '')}` : null;

		// --- Full details: e-mail (HTML) ---
		const html = `
			<h3>🏍️ New motorbike interest on MOTOPRESTO</h3>
			<h4>👤 Client</h4>
			<p><b>Nickname:</b> ${dash(client?.memberNick)}<br/>
			<b>Phone:</b> ${dash(client?.memberPhone)}</p>
			<h4>🏍️ Motorbike</h4>
			<p><b>Title:</b> ${dash(property.propertyTitle)}<br/>
			<b>Brand:</b> ${dash(property.propertyBrand)}<br/>
			<b>Type:</b> ${dash(property.propertyType)}<br/>
			<b>Condition:</b> ${dash(property.propertyCondition)}<br/>
			<b>Year:</b> ${dash(property.propertyYear)}<br/>
			<b>Engine:</b> ${dash(property.propertyEngineCc)} cc<br/>
			<b>Mileage:</b> ${dash(property.propertyMileAge)} km<br/>
			<b>Price:</b> ${priceStr}<br/>
			<b>Location:</b> ${dash(property.propertyLocation)}<br/>
			<b>Address:</b> ${dash(property.propertyAddress)}<br/>
			<b>Options:</b> ${options}</p>
			<h4>📝 Description</h4>
			<p>${dash(property.propertyDesc)}</p>
			<p><b>Listing:</b> <a href="${detailLink}">${detailLink}</a><br/>
			<b>Property ID:</b> ${property._id}</p>
			${imageUrl ? `<p><img src="${imageUrl}" alt="motorbike" style="max-width:480px;border-radius:8px"/></p>` : ''}`;

		// --- Full details: Telegram (HTML) ---
		const telegramText =
			`🏍️ <b>New interest on MOTOPRESTO</b>\n\n` +
			`👤 <b>Client:</b> ${dash(client?.memberNick)}\n` +
			`📞 <b>Phone:</b> ${dash(client?.memberPhone)}\n\n` +
			`<b>${dash(property.propertyTitle)}</b>\n` +
			`🏷️ Brand: ${dash(property.propertyBrand)}\n` +
			`🛵 Type: ${dash(property.propertyType)}\n` +
			`🔧 Condition: ${dash(property.propertyCondition)}\n` +
			`📅 Year: ${dash(property.propertyYear)}\n` +
			`⚙️ Engine: ${dash(property.propertyEngineCc)} cc\n` +
			`🛣️ Mileage: ${dash(property.propertyMileAge)} km\n` +
			`💵 Price: ${priceStr}\n` +
			`📍 Location: ${dash(property.propertyLocation)}\n` +
			`🏠 Address: ${dash(property.propertyAddress)}\n` +
			`🔁 Options: ${options}\n` +
			`📝 ${dash(property.propertyDesc)}\n\n` +
			`🔗 <a href="${detailLink}">Open listing</a>`;

		await Promise.all([
			this.mailService.sendToAdmin('New motorbike interest — MOTOPRESTO', html),
			imageUrl
				? this.telegramService.sendPhotoToAdmin(imageUrl, telegramText)
				: this.telegramService.sendToAdmin(telegramText),
		]);

		return true;
	}

	public async createNotification(input: NotificationInput): Promise<Notification> {
		try {
			return await this.notificationModel.create(input);
		} catch (err: any) {
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
									partId: 1,
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
		await this.notificationModel.findOneAndDelete(match).exec();
		return true;
	};


}
