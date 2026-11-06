import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { AiService } from './ai.service';
import { AiChatInput } from '../../libs/dto/ai/ai.input';
import { AiChatResponse, AiReindexResult } from '../../libs/dto/ai/ai';
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
		const req = ctx?.req;
		const ip = String(req?.headers?.['x-forwarded-for'] ?? req?.ip ?? 'unknown').split(',')[0].trim();
		return await this.aiService.chat(input, memberId ? `m:${memberId}` : `ip:${ip}`);
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
