import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import {
	PartBrand,
	PartCategory,
	PartCondition,
	PartLocation,
	PartStatus,
	PartType,
} from '../../enums/part.enum';
import { Direction } from '../../enums/common.enum';
import { availablePartOptions, availablePartSorts } from '../../config';
import { PeriodsRange, PricesRange } from '../property/property.input';

@InputType()
export class PartInput {
	@IsNotEmpty()
	@Field(() => PartCategory)
	partCategory: PartCategory;

	@IsNotEmpty()
	@Field(() => PartType)
	partType: PartType;

	@IsNotEmpty()
	@Field(() => PartLocation)
	partLocation: PartLocation;

	@IsNotEmpty()
	@Field(() => PartBrand)
	partBrand: PartBrand;

	@IsNotEmpty()
	@Field(() => PartCondition)
	partCondition: PartCondition;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	partTitle: string;

	@IsNotEmpty()
	@Field(() => Int)
	partPrice: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Field(() => Int, { nullable: true })
	partStockCount?: number;

	@IsOptional()
	@Field(() => [PartBrand], { nullable: true })
	partCompatibleBrands?: PartBrand[];

	@IsNotEmpty()
	@Field(() => [String])
	partImages: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	partDesc?: string;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	partBarter?: boolean;

	memberId?: ObjectId;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	soldAt?: Date;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	deletedAt?: Date;
}

@InputType()
export class PartStockRange {
	@Field(() => Int)
	start: number;

	@Field(() => Int)
	end: number;
}

@InputType()
class PartISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	memberId?: ObjectId;

	@IsOptional()
	@Field(() => [PartCategory], { nullable: true })
	categoryList?: PartCategory[];

	@IsOptional()
	@Field(() => [PartType], { nullable: true })
	typeList?: PartType[];

	@IsOptional()
	@Field(() => [PartLocation], { nullable: true })
	locationList?: PartLocation[];

	@IsOptional()
	@Field(() => [PartBrand], { nullable: true })
	brandList?: PartBrand[];

	@IsOptional()
	@Field(() => [PartCondition], { nullable: true })
	conditionList?: PartCondition[];

	@IsOptional()
	@IsIn(availablePartOptions, { each: true })
	@Field(() => [String], { nullable: true })
	options?: string[];

	@IsOptional()
	@Field(() => PricesRange, { nullable: true })
	pricesRange?: PricesRange;

	@IsOptional()
	@Field(() => PeriodsRange, { nullable: true })
	periodsRange?: PeriodsRange;

	@IsOptional()
	@Field(() => PartStockRange, { nullable: true })
	stockRange?: PartStockRange;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class PartsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availablePartSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => PartISearch)
	search: PartISearch;
}

@InputType()
class APartISearch {
	@IsOptional()
	@Field(() => PartStatus, { nullable: true })
	partStatus?: PartStatus;
}

@InputType()
export class AgentPartsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => APartISearch)
	search: APartISearch;
}

@InputType()
class ALPartISearch {
	@IsOptional()
	@Field(() => PartStatus, { nullable: true })
	partStatus?: PartStatus;

	@IsOptional()
	@Field(() => [PartLocation], { nullable: true })
	partLocationList?: PartLocation[];

	@IsOptional()
	@Field(() => [PartCategory], { nullable: true })
	partCategoryList?: PartCategory[];
}

@InputType()
export class AllPartsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => ALPartISearch)
	search: ALPartISearch;
}
