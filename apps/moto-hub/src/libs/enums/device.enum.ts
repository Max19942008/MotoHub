import { registerEnumType } from '@nestjs/graphql';

export enum DevicePlatform {
	IOS = 'IOS',
	ANDROID = 'ANDROID',
	WEB = 'WEB',
}
registerEnumType(DevicePlatform, {
	name: 'DevicePlatform',
});
