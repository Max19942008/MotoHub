import { Field, Int, ObjectType } from "@nestjs/graphql";
import type { ObjectId } from "mongoose";
import { MemberAuthType, MemberStatus, MemberType } from "../../enums/member.enum";
import { PropertyBrand, PropertyCondition, PropertyLocation, PropertyStatus, PropertyType } from "../../enums/property.enum";
import { Member, TotalCounter } from "../member/member";
import { MeLiked } from "../like/like";
// import { MeLiked } from "../like/like";



@ObjectType()
export class Property {
  @Field(() => String)
  
  _id: ObjectId;

   @Field(() => PropertyType)
   propertyType: PropertyType;

   
   @Field(() => PropertyStatus)
   propertyStatus: PropertyStatus;

   
   @Field(() => PropertyLocation)
   propertyLocation: PropertyLocation;

   @Field(() => PropertyBrand)
   propertyBrand: PropertyBrand;

    @Field(() => PropertyCondition)
   propertyCondition: PropertyCondition;

   
   @Field(() => String)
   propertyAddress: string;

     @Field(() => String)
   propertyTitle: string;

     @Field(() => Number)
   propertyPrice: number;

     @Field(() => Number)
   propertyYear: number;

     @Field(() => Int)
   propertyEngineCc: number;

     @Field(() => Int)
   propertyMileAge: number;

     @Field(() => Int)
   propertyViews: number;

    @Field(() => Int)
   propertyLikes: number;
   
    @Field(() => Int)
   propertyComments: number;

    @Field(() => Int)
   propertyRank: number;

    @Field(() => [String])
   propertyImages: string[];

     @Field(() => String, {nullable: true})
   propertyDesc?: string;

    @Field(() => Boolean)
   propertyBarter: boolean;

     @Field(() => Boolean)
   propertyRent: boolean;

    @Field(() => String)
   memberId: ObjectId;

   @Field(() => Date, {nullable: true})
   soldAt?: Date;

   @Field(() => Date, {nullable: true})
   deletedAt?: Date;

    @Field(() => Date, {nullable: true})
   producedAt?: Date;
  
   @Field(() => Date)
   createdAt: Date;

   @Field(() => Date)
   updatedAt: Date;

   /** from Aggregation **/

   @Field(() => Member, {nullable: true})
   memberData?: Member;

   @Field(() => [MeLiked], {nullable: true})
   meLiked?: MeLiked[];
 
}

@ObjectType()
export class Properties {
  @Field(() => [Property])
  list: Property[];

  @Field(() => [TotalCounter], {nullable: true})
  metaCounter: TotalCounter[];
}