import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PartResolver } from './part.resolver';
import { PartService } from './part.service';
import PartSchema from '../../schemas/Part.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: 'Part',
				schema: PartSchema,
			},
		]),
		AuthModule,
		ViewModule,
		MemberModule,
		LikeModule,
		NotificationModule,
	],
	providers: [PartResolver, PartService],
	exports: [PartService],
})
export class PartModule {}
