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
