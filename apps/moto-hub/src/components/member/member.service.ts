import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class MemberService {
  constructor(@InjectModel("Member") private readonly memberModel:Model<null>) {};

  
  public async signup():Promise<String> {
     return "signup executed";
  }

   public async login():Promise<String> {
     return "login executed";
  }

   public async updateMember():Promise<String> {
     return "updateMember executed";
  }

   public async getMember():Promise<String> {
     return "getMember executed";
  }

}
