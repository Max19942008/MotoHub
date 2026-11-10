import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { AiService } from './ai.service';
import { AiChatInput, AiReportInput } from '../../libs/dto/ai/ai.input';
import { AiChatResponse, AiReindexResult, AiReport } from '../../libs/dto/ai/ai';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';

@Resolver()
export class AiResolver {
	constructor(private readonly aiService: AiService) {}

	/** Open to guests too; rate-limited per member, or per IP for guests. */
	@UseGuards(WithoutGuard)
	@Mutation(() => AiChatResponse)
	public async askAssistant(
		@Args('input') input: AiChatInput,
		@AuthMember('_id') memberId: ObjectId,
		@Context() ctx: any,
	): Promise<AiChatResponse> {
		console.log('Mutation: askAssistant');
		return await this.aiService.chat(input, this.requesterKey(memberId, ctx));
	}

	/** Report an offensive or wrong answer. Open to guests; rate-limited like askAssistant. */
	@UseGuards(WithoutGuard)
	@Mutation(() => Boolean)
	public async reportAssistantAnswer(
		@Args('input') input: AiReportInput,
		@AuthMember('_id') memberId: ObjectId,
		@Context() ctx: any,
	): Promise<boolean> {
		console.log('Mutation: reportAssistantAnswer');
		return await this.aiService.report(input, this.requesterKey(memberId, ctx), memberId ? String(memberId) : null);
	}

	/** Admin: latest 100 reports, optionally only NEW or REVIEWED. */
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => [AiReport])
	public async getAiReports(
		@Args('status', { type: () => String, nullable: true }) status?: string,
	): Promise<AiReport[]> {
		console.log('Query: getAiReports');
		return await this.aiService.listReports(status);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Boolean)
	public async markAiReportReviewed(@Args('reportId') reportId: string): Promise<boolean> {
		console.log('Mutation: markAiReportReviewed');
		return await this.aiService.markReportReviewed(reportId);
	}

	private requesterKey(memberId: ObjectId | undefined, ctx: any): string {
		const req = ctx?.req;
		const ip = String(req?.headers?.['x-forwarded-for'] ?? req?.ip ?? 'unknown').split(',')[0].trim();
		return memberId ? `m:${memberId}` : `ip:${ip}`;
	}

	/** Admin: embed new/changed listings now instead of waiting for the periodic sync. */
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => AiReindexResult)
	public async reindexAssistant(): Promise<AiReindexResult> {
		console.log('Mutation: reindexAssistant');
		return await this.aiService.reindex();
	}
}
