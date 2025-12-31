import { Module } from '@nestjs/common';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';
import { MongooseModule } from '@nestjs/mongoose';
import NotificationSchema from '../../schemas/Notification.model';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';

@Module({
       imports:[
      MongooseModule.forFeature([
        {
          name:"Notification",schema: NotificationSchema
        }
      ]),
        AuthModule,
        MemberModule,
        LikeModule
    ],
  providers: [NotificationResolver, NotificationService],
  exports: [NotificationService]
})
export class NotificationModule {}
