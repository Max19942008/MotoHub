import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import {
	PartBrand,
	PartCategory,
	PartCondition,
	PartLocation,
	PartStatus,
	PartType,
} from '../../enums/part.enum';

@InputType()
export class PartUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => PartCategory, { nullable: true })
	partCategory?: PartCategory;

	@IsOptional()
	@Field(() => PartType, { nullable: true })
	partType?: PartType;

	@IsOptional()
	@Field(() => PartStatus, { nullable: true })
	partStatus?: PartStatus;

	@IsOptional()
	@Field(() => PartLocation, { nullable: true })
	partLocation?: PartLocation;

	@IsOptional()
	@Field(() => PartBrand, { nullable: true })
	partBrand?: PartBrand;

	@IsOptional()
	@Field(() => PartCondition, { nullable: true })
	partCondition?: PartCondition;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	partTitle?: string;

	@IsOptional()
	@Field(() => Int, { nullable: true })
	partPrice?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Field(() => Int, { nullable: true })
	partStockCount?: number;

	@IsOptional()
	@Field(() => [PartBrand], { nullable: true })
	partCompatibleBrands?: PartBrand[];

	@IsOptional()
	@Field(() => [String], { nullable: true })
	partImages?: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	partDesc?: string;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	partBarter?: boolean;

	soldAt?: Date;

	deletedAt?: Date;
}
