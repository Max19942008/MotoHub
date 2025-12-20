import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Member } from "../../libs/dto/member/member";
import { T } from "../../libs/types/common";
import { JwtService } from "@nestjs/jwt";
// import { shapeIntoMongoObjectId } from "../../libs/config";

@Injectable()
export class AuthService {
  public async hasPassword(memberPassword: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(memberPassword, salt);
  }

  public async comparePasswords(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
