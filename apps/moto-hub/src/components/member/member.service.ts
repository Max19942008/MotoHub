import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Member } from "../../libs/dto/member/member";
import { LoginInput, MemberInput } from "../../libs/dto/member/member.input";
import { MemberStatus } from "../../libs/enums/member.enum";
import { Message } from "../../libs/enums/common.enum";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class MemberService {
  constructor(
    @InjectModel("Member") private readonly memberModel: Model<Member>,
    private  authService:AuthService
  ) {}

  public async signup(input: MemberInput): Promise<Member> {
    // TODO: HASH PASSWORD
    input.memberPassword = await this.authService.hasPassword(input.memberPassword);
    try {
      const result = await this.memberModel.create(input);
      // TODO: Authentication via Token
      return result;
    } catch (err) {
      console.log("Error,Service.model:", err.message);
      throw new BadRequestException(Message.USED_MEMBERNICK_OR_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    const { memberNick, memberPassword } = input;
    const response = await this.memberModel
      .findOne({ memberNick: memberNick })
      .select("+memberPassword")
      .exec();
    if (!response || response.memberNick === MemberStatus.DELETE) {
      throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
    } else if (response.memberStatus === MemberStatus.BLOCK) {
      throw new InternalServerErrorException(Message.BLOCKED_USER);
    }
    //TODO: Compare Password via bcrypt
    console.log("response:", response);
    const isMatch = await this.authService.comparePasswords(input.memberPassword,response.memberPassword);
    if (!isMatch)
      throw new InternalServerErrorException(Message.WRONG_PASSWORD);

    return response;
  }

  public async updateMember(): Promise<String> {
    return "updateMember executed";
  }

  public async getMember(): Promise<String> {
    return "getMember executed";
  }
}
