import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { ReportService } from './report.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { Report, Reports } from '../../libs/dto/report/report';
import { ReportInput, ReportsInquiry, ReportUpdate } from '../../libs/dto/report/report.input';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class ReportResolver {
	constructor(private readonly reportService: ReportService) {}

	/** Any signed-in member can flag offensive content — App Store Guideline 1.2. */
	@UseGuards(AuthGuard)
	@Mutation(() => Report)
	public async reportContent(
		@Args('input') input: ReportInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Report> {
		console.log('Mutation: reportContent');
		input.reportRefId = shapeIntoMongoObjectId(input.reportRefId);
		return await this.reportService.createReport(memberId, input);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Reports)
	public async getReportsByAdmin(@Args('input') input: ReportsInquiry): Promise<Reports> {
		console.log('Query: getReportsByAdmin');
		return await this.reportService.getReportsByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Report)
	public async updateReportByAdmin(
		@Args('input') input: ReportUpdate,
		@AuthMember('_id') adminId: ObjectId,
	): Promise<Report> {
		console.log('Mutation: updateReportByAdmin');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.reportService.updateReportByAdmin(adminId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Int)
	public async countPendingReportsByAdmin(): Promise<number> {
		console.log('Query: countPendingReportsByAdmin');
		return await this.reportService.countPendingReports();
	}
}
