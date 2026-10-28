import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthResolver } from './google-auth.resolver';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthClient } from './google-oauth.client';
import OAuthStateSchema from '../../schemas/OAuthState.model';
import LoginCodeSchema from '../../schemas/LoginCode.model';
import MemberSchema from '../../schemas/Member.model';

@Module({
	imports: [
		HttpModule,
		MongooseModule.forFeature([
			{ name: 'OAuthState', schema: OAuthStateSchema },
			{ name: 'LoginCode', schema: LoginCodeSchema },
			{ name: 'Member', schema: MemberSchema },
		]),
		AuthModule,
	],
	controllers: [GoogleAuthController],
	providers: [GoogleOAuthClient, GoogleAuthService, GoogleAuthResolver],
})
export class GoogleAuthModule {}
