import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import moment from 'moment';
import { ViewService } from '../view/view.service';
import { LikeService } from '../like/like.service';
import { MemberService } from '../member/member.service';
import { NotificationService } from '../notification/notification.service';
import { Part, Parts } from '../../libs/dto/part/part';
import { AgentPartsInquiry, AllPartsInquiry, PartInput, PartsInquiry } from '../../libs/dto/part/part.input';
import { PartUpdate } from '../../libs/dto/part/part.update';
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { PartStatus } from '../../libs/enums/part.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
import { LikeInput } from '../../libs/dto/like/like.input';
import { StatisticModifier, T } from '../../libs/types/common';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class PartService {
	constructor(
		@InjectModel('Part') private readonly partModel: Model<Part>,
		private memberService: MemberService,
		private viewService: ViewService,
		private likeService: LikeService,
		private notificationService: NotificationService,
	) {}

	public async createPart(input: PartInput): Promise<Part> {
		try {
			const result = await this.partModel.create(input);

			/** Increase MemberParts **/
			await this.memberService.memberStatsEditer({
				_id: result.memberId,
				targetKey: 'memberParts',
				modifier: 1,
			});
			return result;
		} catch (err: any) {
			console.log('Error, PartService.createPart:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getPart(memberId: ObjectId, partId: ObjectId): Promise<Part> {
		const search: T = { _id: partId, partStatus: PartStatus.ACTIVE };

		const targetPart: Part = await this.partModel.findOne(search).lean().exec();
		if (!targetPart) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId: memberId, viewRefId: partId, viewGroup: ViewGroup.PART };
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.partStatsEditor({ _id: partId, targetKey: 'partViews', modifier: 1 });
				targetPart.partViews++;
			}
			/** ME LIKED **/
			const likeInput = { memberId: memberId, likeRefId: partId, likeGroup: LikeGroup.PART };
			targetPart.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		targetPart.memberData = await this.memberService.getMember(null, targetPart.memberId);
		return targetPart;
	}

	public async updatePart(memberId: ObjectId, input: PartUpdate): Promise<Part> {
		let { partStatus, soldAt, deletedAt } = input;
		const search = { _id: input._id, memberId, partStatus: PartStatus.ACTIVE };

		if (partStatus === PartStatus.SOLD) soldAt = moment().toDate();
		else if (partStatus === PartStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.partModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditer({
				_id: memberId,
				targetKey: 'memberParts',
				modifier: -1,
			});
		}

		return result;
	}

	public async getParts(memberId: ObjectId, input: PartsInquiry): Promise<Parts> {
		const match: T = { partStatus: PartStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeMatchQuery(match, input);
		console.log('match:', match);

		const result = await this.partModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							/** LIKED PARTS **/
							lookupAuthMemberLiked(memberId),
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	private shapeMatchQuery(match: T, input: PartsInquiry): void {
		const {
			memberId,
			categoryList,
			typeList,
			locationList,
			brandList,
			conditionList,
			pricesRange,
			periodsRange,
			stockRange,
			options,
			text,
		} = input.search;

		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (categoryList && categoryList.length) match.partCategory = { $in: categoryList };
		if (typeList && typeList.length) match.partType = { $in: typeList };
		if (locationList && locationList.length) match.partLocation = { $in: locationList };
		if (brandList && brandList.length) match.partBrand = { $in: brandList };
		if (conditionList && conditionList.length) match.partCondition = { $in: conditionList };

		if (pricesRange) match.partPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		if (stockRange) match.partStockCount = { $gte: stockRange.start, $lte: stockRange.end };

		if (text) match.partTitle = { $regex: new RegExp(text, 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
	}

	public async getAgentParts(memberId: ObjectId, input: AgentPartsInquiry): Promise<Parts> {
		const { partStatus } = input.search;
		if (partStatus === PartStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = {
			memberId: memberId,
			partStatus: partStatus ?? { $ne: PartStatus.DELETE },
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.partModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async getFavorites(memberId: ObjectId, input: OrdinaryInquiry): Promise<Parts> {
		return await this.likeService.getFavoriteParts(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Parts> {
		return await this.viewService.getVisitedParts(memberId, input);
	}

	public async likeTargetPart(memberId: ObjectId, likeRefId: ObjectId): Promise<Part> {
		const target: Part = await this.partModel.findOne({
			_id: likeRefId,
			partStatus: PartStatus.ACTIVE,
		});
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.PART,
		};

		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.partStatsEditor({ _id: likeRefId, targetKey: 'partLikes', modifier: modifier });

		if (modifier > 0 && memberId.toString() !== target.memberId.toString()) {
			const liker = await this.memberService.getMember(null, memberId);
			await this.notificationService.createNotification({
				notificationType: NotificationType.LIKE,
				notificationGroup: NotificationGroup.PART,
				notificationStatus: NotificationStatus.WAIT,
				notificationTitle: `${liker?.memberNick ?? 'SomeOne'} liked your part "${target.partTitle}"!`,
				notificationDesc: target.partTitle,
				authorId: memberId,
				receiverId: target.memberId,
				partId: likeRefId,
			});

			await this.memberService.memberStatsEditer({
				_id: target.memberId,
				targetKey: 'memberNotifications',
				modifier: 1,
			});
		}
		return result;
	}

	/** ADMIN **/

	public async getAllPartsByAdmin(input: AllPartsInquiry): Promise<Parts> {
		const { partStatus, partLocationList, partCategoryList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (partStatus) match.partStatus = partStatus;
		if (partLocationList) match.partLocation = { $in: partLocationList };
		if (partCategoryList) match.partCategory = { $in: partCategoryList };

		const result = await this.partModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updatePartByAdmin(input: PartUpdate): Promise<Part> {
		let { partStatus, soldAt, deletedAt } = input;
		const search: T = { _id: input._id, partStatus: PartStatus.ACTIVE };

		if (partStatus === PartStatus.SOLD) soldAt = moment().toDate();
		else if (partStatus === PartStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.partModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditer({
				_id: result.memberId,
				targetKey: 'memberParts',
				modifier: -1,
			});
		}

		return result;
	}

	public async removePartByAdmin(partId: ObjectId): Promise<Part> {
		const search: T = { _id: partId, partStatus: PartStatus.DELETE };
		const result = await this.partModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}

	public async partStatsEditor(input: StatisticModifier): Promise<Part> {
		const { _id, targetKey, modifier } = input;
		return this.partModel.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true }).exec();
	}
}
