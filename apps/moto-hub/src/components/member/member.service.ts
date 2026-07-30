import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ObjectId } from "mongoose";
import { AuthTokens, Member, Members } from "../../libs/dto/member/member";
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from "../../libs/dto/member/member.input";
import { MemberStatus, MemberType } from "../../libs/enums/member.enum";
import { Direction, Message } from "../../libs/enums/common.enum";
import { AuthService } from "../auth/auth.service";
import { MemberUpdate } from "../../libs/dto/member/member.update";
import { StatisticModifier, T } from "../../libs/types/common";
import { ViewService } from "../view/view.service";
import { ViewInput } from "../../libs/dto/view/view.input";
import { ViewGroup } from "../../libs/enums/view.enum";
import { LikeInput } from "../../libs/dto/like/like.input";
import { LikeGroup } from "../../libs/enums/like.enum";
import { LikeService } from "../like/like.service";
import { Follower, Following, MeFollowed } from "../../libs/dto/follow/follow";
import { lookupAuthMemberLiked } from "../../libs/config";
import { OrdinaryInquiry } from "../../libs/dto/property/property.input";
import { PropertyStatus } from "../../libs/enums/property.enum";
import { PartStatus } from "../../libs/enums/part.enum";
import { BoardArticleStatus } from "../../libs/enums/board-article.enum";
import { NotificationService } from "../notification/notification.service";
import { NotificationGroup, NotificationStatus, NotificationType } from "../../libs/enums/notification.enum";


@Injectable()
export class MemberService {
  constructor(
    @InjectModel("Member") private readonly memberModel: Model<Member>,
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		@InjectModel('Notification') private readonly notificationModel: Model<Notification>,
		@InjectModel('Block') private readonly blockModel: Model<T>,
		@InjectModel('Property') private readonly propertyModel: Model<T>,
		@InjectModel('Part') private readonly partModel: Model<T>,
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<T>,
    private authService:AuthService,
    private viewService: ViewService,
	  private likeService: LikeService,

  ) {}

  public async signup(input: MemberInput): Promise<Member> {
    /** ADMIN is never self-assignable — the single admin is provisioned manually **/
    if (input.memberType === MemberType.ADMIN) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

    //TODO: hashing passwords
    input.memberPassword = await this.authService.hasPassword(input.memberPassword);
    try {
      const result = await this.memberModel.create(input);
      // TODO: Authentication via Token
      const tokens = await this.authService.issueTokenPair(result);
      result.accessToken = tokens.accessToken;
      result.refreshToken = tokens.refreshToken;

      return result;
    } catch (err: any) {
      console.log("Error,Service.model:", err.message);
      throw new BadRequestException(Message.USED_MEMBERNICK_OR_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    const { memberNick, memberPassword } = input;
    const response = await this.memberModel
      .findOne({ memberNick: memberNick })
      .select("+memberPassword")
      .exec();
    /** A rejected login is a client problem, not a server fault. Returning 500
     *  here made every mistyped password look like an outage in monitoring. */
    if (!response || response.memberStatus === MemberStatus.DELETE) {
      throw new UnauthorizedException(Message.NO_MEMBER_NICK);
    } else if (response.memberStatus === MemberStatus.BLOCK) {
      throw new ForbiddenException(Message.BLOCKED_USER);
    }

    const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
		if (!isMatch) throw new UnauthorizedException(Message.WRONG_PASSWORD);
		const tokens = await this.authService.issueTokenPair(response);
		response.accessToken = tokens.accessToken;
		response.refreshToken = tokens.refreshToken;

    return response;
  };

	/** Exchanges a refresh token for a new pair; also the point where a blocked or
	 *  demoted member stops getting valid access tokens. */
	public async refreshTokens(refreshToken: string): Promise<AuthTokens> {
		return await this.authService.rotateTokens(refreshToken);
	};

	public async logout(refreshToken: string): Promise<boolean> {
		return await this.authService.revokeRefreshToken(refreshToken);
	};


 	public async updateMember(memberId: ObjectId, input: MemberUpdate): Promise<Member> {
		/**
		 * A member may never change their own role, and of the statuses only
		 * DELETE (self-deletion) is theirs to set — everything else is moderation
		 * and belongs to updateMemberByAdmin.
		 */
		delete input.memberType;
		if (input.memberStatus && input.memberStatus !== MemberStatus.DELETE) delete input.memberStatus;

		await this.releaseUniqueFieldsOnDelete(memberId, input);
		const result: Member = await this.memberModel
			.findOneAndUpdate({ _id: memberId, memberStatus: MemberStatus.ACTIVE }, input, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		/** Self-deletion ends every session and takes the member's listings with it. */
		if (input.memberStatus === MemberStatus.DELETE) {
			await this.authService.revokeAllForMember(memberId);
			await this.retireMemberContent(memberId);
		}

		result.accessToken = await this.authService.createToken(result);
		return result;
	};

	/**
	 * When a member is soft-deleted (memberStatus = DELETE) we "release" the
	 * unique fields (phone & nick) by appending a per-member tag so the original
	 * phone/nick become free for a brand-new signup. The record is preserved for
	 * audit — only its unique keys are freed. Idempotent (won't double-tag).
	 */
	private async releaseUniqueFieldsOnDelete(memberId: ObjectId, input: MemberUpdate): Promise<void> {
		if (input.memberStatus !== MemberStatus.DELETE) return;
		const current = await this.memberModel
			.findById(memberId)
			.select('memberPhone memberNick memberStatus')
			.lean()
			.exec();
		if (!current || current.memberStatus === MemberStatus.DELETE) return; // already released
		const tag = `#del#${memberId}`;
		if (current.memberPhone && !current.memberPhone.includes('#del#')) input.memberPhone = `${current.memberPhone}${tag}`;
		if (current.memberNick && !current.memberNick.includes('#del#')) input.memberNick = `${current.memberNick}${tag}`;
		input.deletedAt = new Date();
	};


	public async getMember(memberId: ObjectId, targetId: ObjectId): Promise<Member> {
		const search: T = {
			_id: targetId,
			memberStatus: {
				$in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
			},
		};
		const targetMember = await this.memberModel.findOne(search).lean().exec();
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput: ViewInput = { memberId: memberId, viewRefId: targetId, viewGroup: ViewGroup.MEMBER };
			const newView = await this.viewService.recordView(viewInput);

			if (newView) {
				await this.memberModel.findOneAndUpdate(search, { $inc: { memberViews: 1 } }, { new: true }).exec();
				targetMember.memberViews++;
			} 
				//  MELIKED
			const LikeInput = { memberId: memberId, likeRefId: targetId, likeGroup: LikeGroup.MEMBER };
			targetMember.meLiked = await this.likeService.checkLikeExistence(LikeInput);
			//  ME FOLLOWED
					targetMember.meFollowed = await this.checkSubscription(memberId, targetId);
		 }
       	return targetMember;
    };

	/**
	 * A member who leaves should not leave live listings behind — a buyer would
	 * find a motorbike they can never ask about. Everything still on sale is
	 * retired with the account.
	 *
	 * SOLD listings are left alone: those are history, not inventory.
	 */
	private async retireMemberContent(memberId: ObjectId): Promise<void> {
		const deletedAt = new Date();
		await Promise.all([
			this.propertyModel
				.updateMany(
					{ memberId: memberId, propertyStatus: { $in: [PropertyStatus.ACTIVE, PropertyStatus.HOLD] } },
					{ propertyStatus: PropertyStatus.DELETE, deletedAt: deletedAt },
				)
				.exec(),
			this.partModel
				.updateMany(
					{ memberId: memberId, partStatus: { $in: [PartStatus.ACTIVE, PartStatus.HOLD] } },
					{ partStatus: PartStatus.DELETE, deletedAt: deletedAt },
				)
				.exec(),
			this.boardArticleModel
				.updateMany(
					{ memberId: memberId, articleStatus: BoardArticleStatus.ACTIVE },
					{ articleStatus: BoardArticleStatus.DELETE },
				)
				.exec(),
		]);

		await this.memberModel
			.findByIdAndUpdate(memberId, { memberProperties: 0, memberParts: 0, memberArticles: 0 })
			.exec();
	};


	/**
	 * Owner data to hang off a listing, article or comment.
	 *
	 * Unlike getMember this never throws: a listing whose author has since
	 * soft-deleted their account is still a valid listing, and failing the whole
	 * query over a missing author took every such listing offline.
	 */
	public async getMemberForDisplay(targetId: ObjectId): Promise<Member | null> {
		if (!targetId) return null;
		return await this.memberModel
			.findOne({ _id: targetId, memberStatus: { $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK] } })
			.lean()
			.exec();
	};


	/** ---------- BLOCK (App Store Guideline 1.2) ---------- **/

	/**
	 * Hides a member's content from the blocker. One-directional: the blocked
	 * member is not told and keeps seeing the blocker — mirroring it would leak
	 * the fact that a block happened.
	 */
	public async blockMember(blockerId: ObjectId, blockedId: ObjectId): Promise<boolean> {
		if (blockerId.toString() === blockedId.toString()) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const target = await this.memberModel.findById(blockedId).select('_id').lean().exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		await this.blockModel
			.findOneAndUpdate(
				{ blockerId: blockerId, blockedId: blockedId },
				{ blockerId: blockerId, blockedId: blockedId },
				{ upsert: true },
			)
			.exec();
		return true;
	};

	public async unblockMember(blockerId: ObjectId, blockedId: ObjectId): Promise<boolean> {
		await this.blockModel.deleteOne({ blockerId: blockerId, blockedId: blockedId }).exec();
		return true;
	};

	/**
	 * Ids whose content the given member should not see. Returns [] for guests,
	 * so callers can pass an unauthenticated id without branching.
	 */
	public async getBlockedMemberIds(blockerId: ObjectId): Promise<ObjectId[]> {
		if (!blockerId) return [];
		const rows = await this.blockModel.find({ blockerId: blockerId }).select('blockedId').lean().exec();
		return rows.map((row: T) => row.blockedId);
	};

	public async getBlockedMembers(blockerId: ObjectId, input: OrdinaryInquiry): Promise<Members> {
		const { page, limit } = input;
		const result = await this.blockModel
			.aggregate([
				{ $match: { blockerId: blockerId } },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							{
								$lookup: {
									from: 'members',
									localField: 'blockedId',
									foreignField: '_id',
									as: 'blockedData',
								},
							},
							{ $unwind: '$blockedData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return {
			list: (result[0]?.list ?? []).map((ele: T) => ele.blockedData),
			metaCounter: result[0]?.metaCounter ?? [],
		};
	};


		private async checkSubscription(followerId: ObjectId, followingId: ObjectId): Promise<MeFollowed[]> {
		const result = await this.followModel.findOne({ followingId: followingId, followerId: followerId }).exec();
		return result ? [{ followerId: followerId, followingId: followingId, myFollowing: true }] : [];
	}

    	public async getAgents(memberId: ObjectId, input: AgentsInquiry): Promise<Members> {
		const { text } = input.search;
		const match: T = { memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE };
		const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };
		if (text) match.memberNick = { $regex: new RegExp(text, 'i') };
		console.log('match:', match);
		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit },
							 lookupAuthMemberLiked(memberId)
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		console.log('result:', result);
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	};

	
	public async likeTargetMember(memberId: ObjectId, likeRefId: ObjectId): Promise<Member> {
		const target: Member = await this.memberModel.findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE });
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.MEMBER,
		};

		//LIKE TOGGLE
		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.memberStatsEditer({ _id: likeRefId, targetKey: 'memberLikes', modifier: modifier });

		if (modifier > 0 && memberId.toString() !== likeRefId.toString()) {
			const liker = await this.memberModel.findById(memberId).select('memberNick').lean();
			await this.notificationModel.create({
				notificationType: NotificationType.LIKE,
				notificationGroup: NotificationGroup.MEMBER,
				notificationStatus: NotificationStatus.WAIT,
				notificationTitle: `${liker?.memberNick ?? 'Someone'} liked you!`,
				authorId: memberId,
				receiverId: likeRefId,
			});
			await this.memberStatsEditer({
				_id: likeRefId,
				targetKey: 'memberNotifications',
				modifier: 1,
			});
		}
		return result;
	};


	/** ADMIN **/

  	public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
		const { memberStatus, memberType, text } = input.search;
		const match: T = {};
		const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

		if (memberStatus) match.memberStatus = memberStatus;
		if (memberType) match.memberType = memberType;
		if (text) match.memberNick = { $regex: new RegExp(text, 'i') };
		console.log('match:', match);

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		console.log('result:', result);
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	};

  	public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
		/** The project runs on a single admin — promoting anyone else is rejected here
		 *  so the caller gets a clear message instead of a raw duplicate-key error
		 *  from the unique partial index on memberType. **/
		if (input.memberType === MemberType.ADMIN) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		await this.releaseUniqueFieldsOnDelete(input._id, input);
		const result: Member = await this.memberModel.findByIdAndUpdate({ _id: input._id }, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		/**
		 * Moderation must bite immediately. Dropping the sessions forces the member
		 * back through refresh, which re-reads role and status from the database —
		 * otherwise a block or a demotion would idle until the access token expired.
		 */
		if (input.memberStatus || input.memberType) await this.authService.revokeAllForMember(result._id);
		if (input.memberStatus === MemberStatus.DELETE) await this.retireMemberContent(result._id);

		return result;
	};


		public async memberStatsEditer(input: StatisticModifier): Promise<Member> {
		console.log('executed');
		const { _id, targetKey, modifier } = input;
		return await this.memberModel
			.findByIdAndUpdate(
				_id,
				{
					$inc: { [targetKey]: modifier },
				},
				{ new: true },
			)
			.exec();
	};







}
