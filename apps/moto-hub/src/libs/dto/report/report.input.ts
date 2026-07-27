import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { ReportGroup, ReportReason, ReportStatus } from '../../enums/report.enum';
import { Direction } from '../../enums/common.enum';

@InputType()
export class ReportInput {
	@IsNotEmpty()
	@Field(() => ReportGroup)
	reportGroup: ReportGroup;

	@IsNotEmpty()
	@Field(() => ReportReason)
	reportReason: ReportReason;

	@IsNotEmpty()
	@Field(() => String)
	reportRefId: ObjectId;

	@IsOptional()
	@Length(3, 500)
	@Field(() => String, { nullable: true })
	reportDesc?: string;

	reporterId?: ObjectId;
}

@InputType()
class RISearch {
	@IsOptional()
	@Field(() => ReportStatus, { nullable: true })
	reportStatus?: ReportStatus;

	@IsOptional()
	@Field(() => ReportGroup, { nullable: true })
	reportGroup?: ReportGroup;

	@IsOptional()
	@Field(() => ReportReason, { nullable: true })
	reportReason?: ReportReason;
}

@InputType()
export class ReportsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => RISearch)
	search: RISearch;
}

@InputType()
export class ReportUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsNotEmpty()
	@Field(() => ReportStatus)
	reportStatus: ReportStatus;
}
