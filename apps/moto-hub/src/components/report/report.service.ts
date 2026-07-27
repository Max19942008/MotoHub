import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Report, Reports } from '../../libs/dto/report/report';
import { ReportInput, ReportsInquiry, ReportUpdate } from '../../libs/dto/report/report.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { ReportStatus } from '../../libs/enums/report.enum';
import { T } from '../../libs/types/common';

@Injectable()
export class ReportService {
	constructor(@InjectModel('Report') private readonly reportModel: Model<Report>) {}

	/**
	 * Files a report for review. Reporting the same target twice is treated as a
	 * success rather than an error — from the reporter's side the outcome is the
	 * same, and surfacing "already reported" leaks nothing useful.
	 */
	public async createReport(reporterId: ObjectId, input: ReportInput): Promise<Report> {
		input.reporterId = reporterId;
		try {
			return await this.reportModel.create(input);
		} catch (err: any) {
			if (err?.code === 11000) {
				const existing = await this.reportModel
					.findOne({ reporterId: reporterId, reportRefId: input.reportRefId })
					.exec();
				if (existing) return existing;
			}
			console.log('Error: ReportService.createReport', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	/** ADMIN **/

	public async getReportsByAdmin(input: ReportsInquiry): Promise<Reports> {
		const { reportStatus, reportGroup, reportReason } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (reportStatus) match.reportStatus = reportStatus;
		if (reportGroup) match.reportGroup = reportGroup;
		if (reportReason) match.reportReason = reportReason;

		const result = await this.reportModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							{
								$lookup: {
									from: 'members',
									localField: 'reporterId',
									foreignField: '_id',
									as: 'reporterData',
								},
							},
							{ $unwind: { path: '$reporterData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result[0];
	}

	public async updateReportByAdmin(adminId: ObjectId, input: ReportUpdate): Promise<Report> {
		const result = await this.reportModel
			.findByIdAndUpdate(
				input._id,
				{
					reportStatus: input.reportStatus,
					reviewedAt: new Date(),
					reviewedBy: adminId,
				},
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

	/** Badge for the admin panel: how many reports still need a decision. */
	public async countPendingReports(): Promise<number> {
		return await this.reportModel.countDocuments({ reportStatus: ReportStatus.PENDING }).exec();
	}
}
