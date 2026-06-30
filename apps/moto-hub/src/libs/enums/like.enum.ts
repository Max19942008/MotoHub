import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	PROPERTY = 'PROPERTY',
	ARTICLE = 'ARTICLE',
	PART = 'PART',
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
