import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiSource {
	/** PROPERTY | PART | ARTICLE */
	@Field(() => String)
	sourceType: string;

	@Field(() => String)
	sourceId: string;

	@Field(() => String)
	title: string;

	/** Short line under the title, e.g. "Honda · 2019 · 650cc · SEOUL" */
	@Field(() => String, { nullable: true })
	subtitle?: string;

	@Field(() => Number, { nullable: true })
	price?: number;

	@Field(() => String, { nullable: true })
	currency?: string;

	@Field(() => String, { nullable: true })
	image?: string;

	/** Only for articles: the detail page needs the category in the URL. */
	@Field(() => String, { nullable: true })
	articleCategory?: string;
}

@ObjectType()
export class AiChatResponse {
	@Field(() => String)
	answer: string;

	/** Listings the answer cites, in citation order. */
	@Field(() => [AiSource])
	sources: AiSource[];
}

@ObjectType()
export class AiReindexResult {
	@Field(() => Number)
	embedded: number;

	@Field(() => Number)
	removed: number;

	@Field(() => Number)
	total: number;

	@Field(() => Boolean)
	vectorSearch: boolean;
}
