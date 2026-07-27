import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { AuthTokens, Member } from '../../libs/dto/member/member';
import { T } from '../../libs/types/common';
import { JwtService } from '@nestjs/jwt';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Message } from '../../libs/enums/common.enum';
import { MemberStatus } from '../../libs/enums/member.enum';

/** Access tokens stay short-lived; the refresh token carries the long session. */
export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? '1h';
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 60);


@Injectable()
export class AuthService {
 constructor(
   private jwtService: JwtService,
   @InjectModel('RefreshToken') private readonly refreshTokenModel: Model<T>,
   @InjectModel('Member') private readonly memberModel: Model<Member>,
 ){}


  public async hasPassword(memberPassword: string):Promise<string> {
    const salt = await bcrypt.genSalt()
    return  await bcrypt.hash(memberPassword,salt);
  }

  public async comparePasswords( password:string, hashedPassword:string ):Promise<boolean> {
    return await bcrypt.compare ( password, hashedPassword );
  }

  public async createToken(member:Member):Promise<string> {

    const payload:T = {};
    Object.keys(member['_doc'] ? member['_doc'] : member).map((ele) => {
      payload[`${ele}`] = member[`${ele}`];
    });
    delete payload.memberPassword;


    return this.jwtService.signAsync(payload);
  }

  public async verifyToken(token:string):Promise<Member> {
  const member = await this.jwtService.verifyAsync(token);
  member._id = shapeIntoMongoObjectId(member._id);
  return member;
  }

  /** ---------- REFRESH TOKENS ---------- **/

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Issues an opaque refresh token and stores only its hash. The raw value is
   * returned once — the caller hands it to the client and we can never read it
   * back, which is the point.
   */
  public async issueRefreshToken(memberId: ObjectId): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.refreshTokenModel.create({
      tokenHash: this.hashToken(rawToken),
      memberId: memberId,
      expiresAt: expiresAt,
    });

    return rawToken;
  }

  /** Convenience for login/signup: a fresh access + refresh pair. */
  public async issueTokenPair(member: Member): Promise<AuthTokens> {
    return {
      accessToken: await this.createToken(member),
      refreshToken: await this.issueRefreshToken(member._id),
    };
  }

  /**
   * Rotates a refresh token: the presented one is consumed and a new pair is
   * issued. The member is re-read from the database, so a role change, a block
   * or a soft-delete takes effect at the next refresh instead of lingering for
   * the lifetime of an already-signed JWT.
   */
  public async rotateTokens(rawRefreshToken: string): Promise<AuthTokens> {
    if (!rawRefreshToken) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

    const stored = await this.refreshTokenModel
      .findOne({ tokenHash: this.hashToken(rawRefreshToken) })
      .exec();
    if (!stored) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

    // consume it no matter what happens next — a refresh token is single-use
    await this.refreshTokenModel.deleteOne({ _id: stored._id }).exec();

    if (new Date(stored.expiresAt).getTime() < Date.now()) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

    const member = await this.memberModel.findById(stored.memberId).exec();
    if (!member) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
    if (member.memberStatus === MemberStatus.BLOCK) throw new UnauthorizedException(Message.BLOCKED_USER);
    if (member.memberStatus === MemberStatus.DELETE) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

    return await this.issueTokenPair(member);
  }

  /** Logout: drops the one session the token belongs to. */
  public async revokeRefreshToken(rawRefreshToken: string): Promise<boolean> {
    if (!rawRefreshToken) return true;
    await this.refreshTokenModel.deleteOne({ tokenHash: this.hashToken(rawRefreshToken) }).exec();
    return true;
  }

  /** Drops every session of a member — used on block, delete or "log out everywhere". */
  public async revokeAllForMember(memberId: ObjectId): Promise<boolean> {
    await this.refreshTokenModel.deleteMany({ memberId: memberId }).exec();
    return true;
  }

}
