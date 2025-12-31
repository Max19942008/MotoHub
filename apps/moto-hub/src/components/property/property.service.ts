import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { ViewService } from '../view/view.service';
import { Properties, Property } from '../../libs/dto/property/property';
import {  Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { AgentPropertiesInquiry, AllPropertiesInquiry, OrdinaryInquiry, PropertiesInquiry, PropertyInput } from '../../libs/dto/property/property.input';
import { StatisticModifier, T } from '../../libs/types/common';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import * as moment from 'moment';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';



@Injectable()
export class PropertyService {
  constructor(@InjectModel("Property") private readonly propertyModel:Model<Property>, 
  private memberService: MemberService,  
  private viewService: ViewService,
	private likeService: LikeService,
) {}

  public async createProperty(input: PropertyInput): Promise<Property> {
    
    try {
      const result = await this.propertyModel.create(input);
   
      /** Increase MemberProperty **/
      await this.memberService.memberStatsEditer({
        _id: result.memberId,
        targetKey:"memberProperties",
        modifier: 1,
      })
       return result;
    
       } catch(err) {
       console.log("Error,Service.model:",err.message);
        throw new BadRequestException(Message.UPDATE_FAILED)
       }  
  };
  

  public async getProperty(memberId: ObjectId, propertyId: ObjectId):Promise<Property>{
    const search: T = { _id: propertyId,propertyStatus: PropertyStatus.ACTIVE};

    const targetProperty: Property = await this.propertyModel.findOne(search).lean().exec();
    if(!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    if(memberId) {
      const viewInput = { memberId: memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY};
      const newView = await this.viewService.recordView(viewInput);
      if(newView) {
        await this.propertyStatsEditor({ _id:propertyId, targetKey:"propertyViews", modifier:1 });
        targetProperty.propertyViews ++;
      }
     			/** ME LIKED **/
			const LikeInput = { memberId: memberId, likeRefId: propertyId, likeGroup: LikeGroup.PROPERTY };
			targetProperty.meLiked = await this.likeService.checkLikeExistence(LikeInput);
    }
    
    targetProperty.memberData = await this.memberService.getMember(null, targetProperty.memberId);
    return targetProperty;
  };

  
	public async updateProperty(memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
		let { propertyStatus, soldAt, deletedAt } = input;
		const search = { _id: input._id, memberId,propertyStatus:PropertyStatus.ACTIVE};

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();

		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditer({
				_id: memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	};


  	public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
		const match: T = { propertyStatus: PropertyStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeMatchQuery(match, input);
		console.log('match:', match);
		console.log('memberId:', memberId);

		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
                /** LIKED PROPERTIES **/
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
		console.log('result:', result);

		return result[0];
	};

  	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		const {
			memberId,
			locationList,
			brandList,
			conditionList,
			yearList,
			engineCcList,
			typeList,
			periodsRange,
			pricesRange,
			mileAgeRange,
			options,
			text,
		} = input.search;

		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList && locationList.length) match.propertyLocation = { $in: locationList };
		if (brandList && brandList.length) match.propertyBrand = { $in: brandList };
		if (conditionList && conditionList.length) match.propertyCondition = { $in: conditionList };
		if (yearList && yearList.length) match.propertyYear = { $in: yearList };
		if (engineCcList && engineCcList.length) match.propertyEngineCc = { $in: engineCcList };
		if (typeList && typeList.length) match.propertyType = { $in: typeList };

		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		if (mileAgeRange) match.propertyMileAge = { $gte: mileAgeRange.start, $lte: mileAgeRange.end };

		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
	};


  public async getAgentProperties(memberId: ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = {
			memberId: memberId,
			propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.propertyModel
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
	};
	

		public async getFavorites(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		return await this.likeService.getFavoriteProperties(memberId, input);
	};


	public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		return await this.viewService.getVisitedProperties(memberId, input);
	};


	public async likeTargetProperty(memberId: ObjectId, likeRefId: ObjectId): Promise<Property> {
		const target: Property = await this.propertyModel.findOne({
			_id: likeRefId,
			propertyStatus: PropertyStatus.ACTIVE,
		});
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.PROPERTY,
		};

		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.propertyStatsEditor({ _id: likeRefId, targetKey: 'propertyLikes', modifier: modifier });
		return result;
	};



	public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };

		const result = await this.propertyModel
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
	};


  	public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = { _id: input._id, propertyStatus: PropertyStatus.ACTIVE };

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditer({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	};

  
	public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		const search: T = { _id: propertyId, propertyStatus: PropertyStatus.DELETE };
		const result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	};

	
    public async  propertyStatsEditor(input:StatisticModifier):Promise<Property> {
    const {_id, targetKey, modifier} = input;
    return this.propertyModel.findByIdAndUpdate(
      _id,
      {$inc: {[targetKey]: modifier } },
      {new: true}
    ).exec();
};
  

  }