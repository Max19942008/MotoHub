import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { PropertyBrand, PropertyCondition, PropertyLocation, PropertyStatus, PropertyType } from '../../enums/property.enum';
import { Currency } from '../../enums/currency.enum';


@InputType()
 export class  PropertyUpdate {
  @IsNotEmpty()
  @Field(() => String)
  _id: ObjectId;

  @IsOptional()
  @Field(() => PropertyType, { nullable: true })
  propertyType?: PropertyType;

  @IsOptional()
  @Field(() => PropertyStatus, { nullable: true })
  propertyStatus?: PropertyStatus;

  @IsOptional()
  @Field(() => PropertyLocation, { nullable: true })
  propertyLocation?: PropertyLocation;

  /**
   * Optional like every other field here. It used to be required, which made a
   * partial update impossible: "mark as sold" and "delete my listing" send only
   * _id and the new status, so the mutation was rejected before it ever reached
   * the resolver.
   */
  @IsOptional()
  @Field(() => PropertyBrand, { nullable: true })
  propertyBrand?: PropertyBrand;

   @IsOptional()
  @Field(() => PropertyCondition, { nullable: true })
  propertyCondition?: PropertyCondition;

  @IsOptional()
  @Length(3, 100)
  @Field(() => String, { nullable: true })
  propertyAddress?: string;

  @IsOptional()
  @Length(3, 100)
  @Field(() => String, { nullable: true })
  propertyTitle?: string;

  @IsOptional()
  @Field(() => Number, { nullable: true })
  propertyPrice?: number;

  @IsOptional()
  @Field(() => Currency, { nullable: true })
  propertyCurrency?: Currency;

  @IsOptional()
  @Field(() => Number, { nullable: true })
  propertyYear?: number;

  @IsOptional()
@IsInt()
@Min(1)
@Field(() => Int, { nullable: true })
propertyEngineCc?: number;

@IsOptional()
@IsInt()
@Min(1)
@Field(() => Int, { nullable: true })
propertyMileAge?: number;

@IsOptional()
@Field(() => [String], { nullable: true })
propertyImages?: string[];

@IsOptional()
@Length(5, 500)
@Field(() => String, { nullable: true })
propertyDesc?: string;

@IsOptional()
@Field(() => Boolean, { nullable: true })
propertyBarter?: boolean;

@IsOptional()
@Field(() => Boolean, { nullable: true })
propertyRent?: boolean;


soldAt?: Date;


deletedAt?: Date;

@IsOptional()
@Field(() => Date, {nullable:true})
producedAt?: Date;

}