import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import {
	PartBrand,
	PartCategory,
	PartCondition,
	PartLocation,
	PartStatus,
	PartType,
} from '../../enums/part.enum';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';

@ObjectType()
export class Part {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => PartCategory)
	partCategory: PartCategory;

	@Field(() => PartType)
	partType: PartType;

	@Field(() => PartStatus)
	partStatus: PartStatus;

	@Field(() => PartLocation)
	partLocation: PartLocation;

	@Field(() => PartBrand)
	partBrand: PartBrand;

	@Field(() => PartCondition)
	partCondition: PartCondition;

	@Field(() => String)
	partTitle: string;

	@Field(() => Number)
	partPrice: number;

	@Field(() => Int)
	partStockCount: number;

	@Field(() => [PartBrand], { nullable: true })
	partCompatibleBrands?: PartBrand[];

	@Field(() => Int)
	partViews: number;

	@Field(() => Int)
	partLikes: number;

	@Field(() => Int)
	partComments: number;

	@Field(() => Int)
	partRank: number;

	@Field(() => [String])
	partImages: string[];

	@Field(() => String, { nullable: true })
	partDesc?: string;

	@Field(() => Boolean)
	partBarter: boolean;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date, { nullable: true })
	soldAt?: Date;

	@Field(() => Date, { nullable: true })
	deletedAt?: Date;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	/** from Aggregation **/

	@Field(() => Member, { nullable: true })
	memberData?: Member;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];
}

@ObjectType()
export class Parts {
	@Field(() => [Part])
	list: Part[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
