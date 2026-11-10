import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, IsIn, IsNotEmpty, IsOptional, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class AiChatTurnInput {
	@IsIn(['user', 'assistant'])
	@Field(() => String)
	role: 'user' | 'assistant';

	@IsNotEmpty()
	@Length(1, 4000)
	@Field(() => String)
	content: string;
}

@InputType()
export class AiChatInput {
	@IsNotEmpty()
	@Length(1, 1000)
	@Field(() => String)
	message: string;

	/** Earlier turns of this chat, oldest first. The server keeps no chat state. */
	@IsOptional()
	@ArrayMaxSize(20)
	@ValidateNested({ each: true })
	@Type(() => AiChatTurnInput)
	@Field(() => [AiChatTurnInput], { nullable: true })
	history?: AiChatTurnInput[];
}

export const AI_REPORT_REASONS = ['OFFENSIVE', 'WRONG', 'SPAM', 'OTHER'] as const;

@InputType()
export class AiReportInput {
	@IsIn(AI_REPORT_REASONS as unknown as string[])
	@Field(() => String)
	reason: string;

	@IsOptional()
	@Length(0, 500)
	@Field(() => String, { nullable: true })
	comment?: string;

	/** The user question the reported answer replied to. */
	@IsNotEmpty()
	@Length(1, 1000)
	@Field(() => String)
	question: string;

	@IsNotEmpty()
	@Length(1, 8000)
	@Field(() => String)
	answer: string;

	@IsOptional()
	@IsIn(['web', 'android', 'ios'])
	@Field(() => String, { nullable: true })
	platform?: string;
}
