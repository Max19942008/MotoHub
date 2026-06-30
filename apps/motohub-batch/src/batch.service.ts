import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Member } from 'apps/moto-hub/src/libs/dto/member/member';
import { Property } from 'apps/moto-hub/src/libs/dto/property/property';
import { Part } from 'apps/moto-hub/src/libs/dto/part/part';
import { Message } from 'apps/moto-hub/src/libs/enums/common.enum';
import { MemberStatus, MemberType } from 'apps/moto-hub/src/libs/enums/member.enum';
import { PropertyStatus } from 'apps/moto-hub/src/libs/enums/property.enum';
import { PartStatus } from 'apps/moto-hub/src/libs/enums/part.enum';

import { Model } from 'mongoose';


@Injectable()
export class BatchService {
  constructor(
    @InjectModel('Property') private readonly propertyModel:Model<Property>,
    @InjectModel('Part') private readonly partModel:Model<Part>,
    @InjectModel('Member') private readonly memberModel:Model<Member>,
) {}

  public async batchRollbeck():Promise<void> {
   await this.propertyModel.updateMany(
    { propertyStatus: PropertyStatus.ACTIVE },{propertyRank: 0},).exec();

  await this.partModel.updateMany(
    { partStatus: PartStatus.ACTIVE },{partRank: 0},).exec();

  await this.memberModel.updateMany(
    { memberStatus: MemberStatus.ACTIVE,
      memberType: MemberType.AGENT,
     },
     {memberRank: 0},).exec();
  }


    public async batchTopProperties():Promise<void> {
      const properties:Property[] = await this.propertyModel.find({
        propertyStatus: PropertyStatus.ACTIVE,
        propertyRank: 0,
      }).exec();

      const promisedList = properties.map(async(ele: Property) => {
        const { _id,propertyLikes, propertyViews } = ele;
        const rank = propertyLikes * 2 + propertyViews * 1;
        return await this.propertyModel.findByIdAndUpdate(_id, {propertyRank:rank});
      });
      await Promise.all(promisedList);
    }


    public async batchTopParts():Promise<void> {
      const parts:Part[] = await this.partModel.find({
        partStatus: PartStatus.ACTIVE,
        partRank: 0,
      }).exec();

      const promisedList = parts.map(async(ele: Part) => {
        const { _id, partLikes, partViews } = ele;
        const rank = partLikes * 2 + partViews * 1;
        return await this.partModel.findByIdAndUpdate(_id, {partRank:rank});
      });
      await Promise.all(promisedList);
    }


      public async batchTopAgents():Promise<void> {
          const agents: Member[] = await this.memberModel.find({
            memberType: MemberType.AGENT,
            memberStatus: MemberStatus.ACTIVE,
            memberRank: 0,
      })
      .exec();
      if(!agents.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND)

      const promisedList = agents.map(async (ele: Member) => {
        const { _id, memberProperties, memberParts, memberLikes, memberArticles, memberViews } = ele;
        const rank = memberProperties * 5 + memberParts * 4 + memberArticles * 3 + memberLikes * 2 + memberViews * 1;
        return await this.memberModel.findByIdAndUpdate(_id, {memberRank: rank});
      })
      await Promise.all(promisedList);
      }

  // public getHello(): string {
  //  return 'Welcome to Nestar BATCH Api Server!';
  // }

}