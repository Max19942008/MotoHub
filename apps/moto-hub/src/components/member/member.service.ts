import { Injectable } from '@nestjs/common';

@Injectable()
export class MemberService {
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
