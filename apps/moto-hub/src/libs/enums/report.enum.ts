import { registerEnumType } from '@nestjs/graphql';

/** What is being reported. */
export enum ReportGroup {
	MEMBER = 'MEMBER',
	PROPERTY = 'PROPERTY',
	PART = 'PART',
	ARTICLE = 'ARTICLE',
	COMMENT = 'COMMENT',
}
registerEnumType(ReportGroup, {
	name: 'ReportGroup',
});

export enum ReportReason {
	SPAM = 'SPAM',
	SCAM = 'SCAM',
	OFFENSIVE = 'OFFENSIVE',
	PROHIBITED_ITEM = 'PROHIBITED_ITEM',
	MISLEADING = 'MISLEADING',
	HARASSMENT = 'HARASSMENT',
	OTHER = 'OTHER',
}
registerEnumType(ReportReason, {
	name: 'ReportReason',
});

export enum ReportStatus {
	PENDING = 'PENDING',
	REVIEWED = 'REVIEWED',
	DISMISSED = 'DISMISSED',
}
registerEnumType(ReportStatus, {
	name: 'ReportStatus',
});
