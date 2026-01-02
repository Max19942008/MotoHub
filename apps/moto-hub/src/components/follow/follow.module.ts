import { Module} from '@nestjs/common';
import { LikeModule } from '../like/like.module';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowResolver } from './follow.resolver';
import { FollowService } from './follow.service';
import FollowSchema from '../../schemas/Follow.model';
import { MemberModule } from '../member/member.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports:[
      MongooseModule.forFeature([
        {
          name:"Follow",schema: FollowSchema 
        }
      ]),
        AuthModule,
        MemberModule,
        LikeModule,
        NotificationModule
    ],
    providers: [FollowResolver, FollowService],
    exports: [FollowService]
})
export class FollowModule {}
