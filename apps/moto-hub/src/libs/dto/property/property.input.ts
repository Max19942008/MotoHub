import { Field, InputType, Int } from "@nestjs/graphql";
import {IsIn, IsInt, IsNotEmpty, IsOptional, Length, Min} from "class-validator"
import { PropertyBrand, PropertyCondition, PropertyLocation, PropertyStatus, PropertyType } from "../../enums/property.enum";
import { ObjectId } from "mongoose";
// import { availableOptions, availablePropertySorts } from "../../config";
import { Direction } from "../../enums/common.enum";
import { availableOptions, availablePropertySorts } from "../../config";



@InputType()
export class PropertyInput {
 @IsNotEmpty()
 @Field(() => PropertyType)
 propertyType: PropertyType;

 @IsNotEmpty()
 @Field(() => PropertyLocation)
 propertyLocation: PropertyLocation;

 @IsNotEmpty()
 @Field(() => PropertyBrand)
 propertyBrand: PropertyBrand;

  @IsNotEmpty()
 @Field(() => PropertyCondition)
 propertyCondition: PropertyCondition

 @IsNotEmpty()
 @Length(3, 100)
 @Field(() => String)
 propertyAddress: string;

@IsNotEmpty()
 @Length(3, 100)
 @Field(() => String)
 propertyTitle: string;

@IsNotEmpty()
 @Field(() => Int)
 propertyPrice: number;

 @IsNotEmpty()
 @Field(() => Int)
 propertyYear: number;

  @IsNotEmpty()
  @IsInt()
  @Min(125)
 @Field(() => Int)
 propertyEngineCc: number;

 @IsNotEmpty()
 @IsInt()
  @Min(10)
 @Field(() => Int)
 propertyMileAge: number;

  @IsNotEmpty()
 @Field(() => [String])
 propertyImages: string[];

 @IsOptional()
 @Length(5, 500)
 @Field(() => String, {nullable: true})
 propertyDesc?:string;

  @IsOptional()
 @Field(() => Boolean, {nullable: true})
 propertyBarter?:boolean;

 @IsOptional()
 @Field(() => Boolean, {nullable: true})
 propertyRent?:boolean;

 memberId?:ObjectId;

 @IsOptional()
 @Field(() => Date, {nullable: true})
 producedAt?:Date;

@IsOptional()
 @Field(() => Date, {nullable: true})
 soldAt?:Date;

 @IsOptional()
 @Field(() => Date, {nullable: true})
 deletedAt?:Date;

}

@InputType()
export class PricesRange{
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
};

@InputType()
export class MileAgeRange{
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
};

@InputType()
export class PeriodsRange{
  @Field(() => Date)
  start: Date;

  @Field(() => Date)
  end: Date;
};

@InputType()
export class YearRange {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
};


@InputType()
class PISearch {
  @IsOptional()
  @Field(() => String, { nullable: true })
  memberId?: ObjectId;

  @IsOptional()
  @Field(() => [PropertyLocation], { nullable: true })
  locationList?: PropertyLocation[];

   @IsOptional()
  @Field(() => [PropertyBrand], { nullable: true })
  brandList?: PropertyBrand[];

  @IsOptional()
  @Field(() => [PropertyCondition], { nullable: true })
  conditionList?: PropertyCondition[];

  @IsOptional()
  @Field(() => [PropertyType], { nullable: true })
  typeList?: PropertyType[];

  @IsOptional()
  @Field(() => [Int], { nullable: true })
  yearList?: number[];

  @IsOptional()
  @Field(() => YearRange, { nullable: true })
  yearRange?: YearRange;

  @IsOptional()
  @Field(() => [Int], { nullable: true })
  engineCcList?: number[];

  @IsOptional()
  @IsIn(availableOptions, { each: true })
  @Field(() => [String], { nullable: true })
  options?: string[];

  @IsOptional()
  @Field(() => PricesRange, { nullable: true })
  pricesRange?: PricesRange;

  @IsOptional()
  @Field(() => PeriodsRange, { nullable: true })
  periodsRange?: PeriodsRange;

  @IsOptional()
  @Field(() => MileAgeRange, { nullable: true })
  mileAgeRange?: MileAgeRange;

  @IsOptional()
  @Field(() => String, { nullable: true })
  text?: string;


}

@InputType()
export class PropertiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availablePropertySorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => PISearch)
  search: PISearch;
}

@InputType()
class APISearch {
  @IsOptional()
  @Field(() => PropertyStatus, {nullable: true})
  propertyStatus?: PropertyStatus;
}

@InputType()
export class AgentPropertiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  // @IsIn(availablePropertySorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => APISearch)
  search: APISearch;
}


@InputType()
class ALPISearch {
  @IsOptional()
  @Field(() => PropertyStatus, { nullable: true })
  propertyStatus?: PropertyStatus;

  @IsOptional()
  @Field(() => [PropertyLocation], { nullable: true })
  propertyLocationList?: PropertyLocation[];
}

@InputType()
export class AllPropertiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  // @IsIn(availablePropertySorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => ALPISearch)
  search: ALPISearch;
}

@InputType()
export class OrdinaryInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

}
