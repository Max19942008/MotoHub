import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';
import { MongooseModule } from '@nestjs/mongoose';
import NotificationSchema from '../../schemas/Notification.model';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { MailService } from './channels/mail.service';
import { TelegramService } from './channels/telegram.service';
import { PushService } from './channels/push.service';
import DeviceTokenSchema from '../../schemas/DeviceToken.model';

@Module({
       imports:[
      MongooseModule.forFeature([
        { name: "Notification", schema: NotificationSchema },
        { name: "Member", schema: MemberSchema },
        { name: "DeviceToken", schema: DeviceTokenSchema },
      ]),
        AuthModule,
        HttpModule
    ],
  providers: [NotificationResolver, NotificationService, MailService, TelegramService, PushService],
  exports: [NotificationService]
})
export class NotificationModule {}
