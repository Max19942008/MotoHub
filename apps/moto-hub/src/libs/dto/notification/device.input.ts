import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { DevicePlatform } from '../../enums/device.enum';

@InputType()
export class DeviceTokenInput {
	@IsNotEmpty()
	@Field(() => String)
	deviceToken: string;

	@IsNotEmpty()
	@Field(() => DevicePlatform)
	devicePlatform: DevicePlatform;
}
