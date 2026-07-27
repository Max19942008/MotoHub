import {Module} from "@nestjs/common";
import {AuthService, ACCESS_TOKEN_TTL} from "./auth.service";
import { HttpModule } from "@nestjs/axios";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import RefreshTokenSchema from "../../schemas/RefreshToken.model";
import MemberSchema from "../../schemas/Member.model";


@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: "RefreshToken", schema: RefreshTokenSchema },
      { name: "Member", schema: MemberSchema },
    ]),
    JwtModule.register({
      secret: `${process.env.SECRET_TOKEN}`,
      signOptions: {expiresIn: ACCESS_TOKEN_TTL}
    })
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
