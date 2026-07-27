import { Module } from '@nestjs/common';
import { MemberResolver } from './member.resolver';
import { MemberService } from './member.service';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { LikeModule } from '../like/like.module';
import FollowSchema from '../../schemas/Follow.model';
import { NotificationModule } from '../notification/notification.module';
import NotificationSchema from '../../schemas/Notification.model';
import BlockSchema from '../../schemas/Block.model';
import PropertySchema from '../../schemas/Property.model';
import PartSchema from '../../schemas/Part.model';
import BoardArticleSchema from '../../schemas/BoardArticle.model';

@Module({
  imports: [ MongooseModule.forFeature([{name:"Member",schema: MemberSchema }]),
   MongooseModule.forFeature( [ { name:"Follow",schema: FollowSchema } ] ),
  MongooseModule.forFeature( [ { name:"Notification",schema: NotificationSchema } ] ),
  MongooseModule.forFeature( [ { name:"Block",schema: BlockSchema } ] ),
  /** Read/written only to retire a departing member's listings — see retireMemberContent. */
  MongooseModule.forFeature( [ { name:"Property",schema: PropertySchema } ] ),
  MongooseModule.forFeature( [ { name:"Part",schema: PartSchema } ] ),
  MongooseModule.forFeature( [ { name:"BoardArticle",schema: BoardArticleSchema } ] ),
  AuthModule,
  ViewModule,
  LikeModule,
],
  providers: [MemberResolver, MemberService],
  exports: [MemberService]
})
export class MemberModule {}
