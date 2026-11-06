import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { GeminiClient } from './gemini.client';
import { AiSource } from '../../libs/dto/ai/ai';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { PartStatus } from '../../libs/enums/part.enum';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';

export type SourceType = 'PROPERTY' | 'PART' | 'ARTICLE';

export interface RetrievedDoc {
	source: AiSource;
	/** The text the model sees for this document. */
	text: string;
	score: number;
}

interface SourceSpec {
	collection: string;
	activeFilter: Record<string, unknown>;
	toText(doc: any): string;
	toSource(doc: any): AiSource;
}

const VECTOR_INDEX = 'ai_vector_index';
const EMBED_BATCH = 50;
/** Safety cap per source type so a runaway collection cannot burn the embedding quota. */
const MAX_DOCS_PER_TYPE = 5000;

const stripHtml = (s = '') =>
	s
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const yesNo = (v: boolean) => (v ? 'yes' : 'no');

const SPECS: Record<SourceType, SourceSpec> = {
	PROPERTY: {
		collection: 'properties',
		activeFilter: { propertyStatus: PropertyStatus.ACTIVE },
		toText: (d) =>
			[
				`Motorcycle for sale: ${d.propertyTitle}`,
				`Brand: ${d.propertyBrand}. Type: ${d.propertyType}. Year: ${d.propertyYear}.`,
				`Engine: ${d.propertyEngineCc}cc. Mileage: ${d.propertyMileAge} km. Condition: ${d.propertyCondition}.`,
				`Location: ${d.propertyLocation} (${d.propertyAddress}).`,
				`Price: ${d.propertyPrice} ${d.propertyCurrency ?? 'USD'}. Barter: ${yesNo(d.propertyBarter)}. Rent: ${yesNo(d.propertyRent)}.`,
				d.propertyDesc ? `Description: ${stripHtml(d.propertyDesc).slice(0, 1500)}` : '',
			]
				.filter(Boolean)
				.join('\n'),
		toSource: (d) => ({
			sourceType: 'PROPERTY',
			sourceId: String(d._id),
			title: d.propertyTitle,
			subtitle: [d.propertyBrand, d.propertyYear, `${d.propertyEngineCc}cc`, d.propertyLocation].join(' · '),
			price: d.propertyPrice,
			currency: d.propertyCurrency ?? 'USD',
			image: d.propertyImages?.[0],
		}),
	},
	PART: {
		collection: 'parts',
		activeFilter: { partStatus: PartStatus.ACTIVE },
		toText: (d) =>
			[
				`${d.partCategory === 'ACCESSORY' ? 'Accessory' : 'Spare part'} for sale: ${d.partTitle}`,
				`Category: ${d.partCategory}. Type: ${d.partType}. Brand: ${d.partBrand}. Condition: ${d.partCondition}.`,
				d.partCompatibleBrands?.length ? `Fits motorbike brands: ${d.partCompatibleBrands.join(', ')}.` : '',
				`Location: ${d.partLocation}. In stock: ${d.partStockCount ?? 1}.`,
				`Price: ${d.partPrice} ${d.partCurrency ?? 'USD'}. Barter: ${yesNo(d.partBarter)}.`,
				d.partDesc ? `Description: ${stripHtml(d.partDesc).slice(0, 1500)}` : '',
			]
				.filter(Boolean)
				.join('\n'),
		toSource: (d) => ({
			sourceType: 'PART',
			sourceId: String(d._id),
			title: d.partTitle,
			subtitle: [d.partBrand, d.partType, d.partCondition, d.partLocation].join(' · '),
			price: d.partPrice,
			currency: d.partCurrency ?? 'USD',
			image: d.partImages?.[0],
		}),
	},
	ARTICLE: {
		collection: 'boardArticles',
		activeFilter: { articleStatus: BoardArticleStatus.ACTIVE },
		toText: (d) =>
			[
				`Community article (${d.articleCategory}): ${d.articleTitle}`,
				stripHtml(d.articleContent).slice(0, 2500),
			].join('\n'),
		toSource: (d) => ({
			sourceType: 'ARTICLE',
			sourceId: String(d._id),
			title: d.articleTitle,
			subtitle: d.articleCategory,
			image: d.articleImage,
			articleCategory: d.articleCategory,
		}),
	},
};

/**
 * Retrieval half of the assistant: keeps `ai_embeddings` in sync with active listings,
 * parts and articles, and finds the ones closest to a question.
 *
 * Search uses Atlas Vector Search; when the index is missing or still building
 * (or the DB is a local mongod), it falls back to brute-force cosine in memory,
 * which is fine for a few thousand documents.
 */
@Injectable()
export class RagService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RagService.name);
	private syncing: Promise<{ embedded: number; removed: number }> | null = null;
	private timer?: NodeJS.Timeout;
	private vectorIndexReady = false;

	constructor(
		@InjectModel('AiEmbedding') private readonly embeddingModel: Model<any>,
		@InjectConnection() private readonly connection: Connection,
		private readonly gemini: GeminiClient,
	) {}

	get enabled(): boolean {
		return this.gemini.enabled;
	}

	get vectorSearch(): boolean {
		return this.vectorIndexReady;
	}

	onModuleInit() {
		if (!this.enabled) {
			this.logger.warn('GEMINI_API_KEY not set — AI assistant retrieval is disabled');
			return;
		}
		// Never block app start on this; Render health checks wait for the port.
		void this.ensureVectorIndex().then(() => this.sync().catch((e) => this.logger.error(`Initial sync failed: ${e.message}`)));

		const minutes = Number(process.env.AI_SYNC_MINUTES) || 15;
		this.timer = setInterval(() => {
			this.sync().catch((e) => this.logger.error(`Sync failed: ${e.message}`));
		}, minutes * 60_000);
		this.timer.unref();
	}

	onModuleDestroy() {
		if (this.timer) clearInterval(this.timer);
	}

	/** Stored on each vector; a different model or size forces a re-embed. */
	private get embedTag(): string {
		return `${this.gemini.embeddingModel}@${this.gemini.dimensions}`;
	}

	/** Creates the Atlas Vector Search index, or updates it when the embedding size changed. */
	private async ensureVectorIndex() {
		try {
			await this.embeddingModel.createCollection().catch(() => undefined);
			const collection = this.embeddingModel.collection;
			const definition = {
				fields: [
					{ type: 'vector', path: 'embedding', numDimensions: this.gemini.dimensions, similarity: 'cosine' },
					{ type: 'filter', path: 'sourceType' },
				],
			};
			const [existing] = (await collection.listSearchIndexes(VECTOR_INDEX).toArray()) as any[];
			if (!existing) {
				await collection.createSearchIndex({ name: VECTOR_INDEX, type: 'vectorSearch', definition });
				this.logger.log(`Created Atlas vector index "${VECTOR_INDEX}" (takes ~1 min to build)`);
			} else {
				const dims = existing.latestDefinition?.fields?.find((f: any) => f.type === 'vector')?.numDimensions;
				if (dims !== this.gemini.dimensions) {
					await collection.updateSearchIndex(VECTOR_INDEX, definition);
					this.logger.log(`Updated Atlas vector index "${VECTOR_INDEX}" to ${this.gemini.dimensions} dims`);
				}
			}
			this.vectorIndexReady = true;
		} catch (e) {
			this.vectorIndexReady = false;
			this.logger.warn(`Atlas Vector Search unavailable, using in-memory search: ${e.message}`);
		}
	}

	/** Embeds new/changed documents and drops vectors of removed ones. Concurrent calls share one run. */
	sync(): Promise<{ embedded: number; removed: number }> {
		if (!this.syncing) {
			this.syncing = this.runSync().finally(() => (this.syncing = null));
		}
		return this.syncing;
	}

	private async runSync() {
		let embedded = 0;
		let removed = 0;

		for (const type of Object.keys(SPECS) as SourceType[]) {
			const spec = SPECS[type];
			const docs = await this.connection
				.collection(spec.collection)
				.find(spec.activeFilter)
				.sort({ updatedAt: -1 })
				.limit(MAX_DOCS_PER_TYPE)
				.toArray();

			const existing = await this.embeddingModel
				.find({ sourceType: type }, { sourceId: 1, sourceUpdatedAt: 1, model: 1 })
				.lean<{ _id: Types.ObjectId; sourceId: Types.ObjectId; sourceUpdatedAt: Date; model: string }[]>();
			const byId = new Map(existing.map((e) => [String(e.sourceId), e]));

			const stale = docs.filter((d) => {
				const e = byId.get(String(d._id));
				const updatedAt = d.updatedAt ?? d.createdAt ?? new Date(0);
				return !e || e.model !== this.embedTag || new Date(updatedAt) > new Date(e.sourceUpdatedAt);
			});

			for (let i = 0; i < stale.length; i += EMBED_BATCH) {
				const batch = stale.slice(i, i + EMBED_BATCH);
				const texts = batch.map((d) => spec.toText(d));
				const vectors = await this.gemini.embed(texts, 'document');
				await this.embeddingModel.bulkWrite(
					batch.map((d, j) => ({
						updateOne: {
							filter: { sourceType: type, sourceId: d._id },
							update: {
								$set: {
									text: texts[j],
									embedding: vectors[j],
									model: this.embedTag,
									sourceUpdatedAt: d.updatedAt ?? d.createdAt ?? new Date(),
								},
							},
							upsert: true,
						},
					})),
				);
				embedded += batch.length;
			}

			const activeIds = new Set(docs.map((d) => String(d._id)));
			const gone = existing.filter((e) => !activeIds.has(String(e.sourceId))).map((e) => e._id);
			if (gone.length) {
				await this.embeddingModel.deleteMany({ _id: { $in: gone } });
				removed += gone.length;
			}
		}

		if (embedded || removed) this.logger.log(`AI index sync: embedded ${embedded}, removed ${removed}`);
		return { embedded, removed };
	}

	async count(): Promise<number> {
		return this.embeddingModel.estimatedDocumentCount();
	}

	/** Top-k active documents for a question, best first. */
	async search(query: string, k = 8): Promise<RetrievedDoc[]> {
		const [queryVector] = await this.gemini.embed([query], 'query', 2); // a user is waiting

		let hits: { sourceType: SourceType; sourceId: Types.ObjectId; text: string; score: number }[] = [];
		if (this.vectorIndexReady) {
			try {
				hits = await this.embeddingModel.aggregate([
					{
						$vectorSearch: {
							index: VECTOR_INDEX,
							path: 'embedding',
							queryVector,
							numCandidates: Math.max(100, k * 15),
							limit: k * 2,
						},
					},
					{ $project: { sourceType: 1, sourceId: 1, text: 1, score: { $meta: 'vectorSearchScore' } } },
				]);
			} catch (e) {
				this.logger.warn(`$vectorSearch failed, falling back to in-memory: ${e.message}`);
			}
		}
		// An index that is still building answers with nothing.
		if (hits.length === 0) hits = await this.searchInMemory(queryVector, k * 2);

		return (await this.hydrate(hits)).slice(0, k);
	}

	private async searchInMemory(queryVector: number[], limit: number) {
		const all = await this.embeddingModel
			.find({}, { sourceType: 1, sourceId: 1, text: 1, embedding: 1 })
			.lean<{ sourceType: SourceType; sourceId: Types.ObjectId; text: string; embedding: number[] }[]>();
		const qNorm = Math.hypot(...queryVector);

		return all
			.map((d) => {
				let dot = 0;
				for (let i = 0; i < queryVector.length; i++) dot += queryVector[i] * (d.embedding[i] ?? 0);
				return { sourceType: d.sourceType, sourceId: d.sourceId, text: d.text, score: dot / (qNorm * Math.hypot(...d.embedding) || 1) };
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	/** Loads the live documents behind the hits, dropping any that went inactive since the last sync. */
	private async hydrate(hits: { sourceType: SourceType; sourceId: Types.ObjectId; text: string; score: number }[]) {
		const result: RetrievedDoc[] = [];
		for (const type of Object.keys(SPECS) as SourceType[]) {
			const ids = hits.filter((h) => h.sourceType === type).map((h) => h.sourceId);
			if (!ids.length) continue;
			const spec = SPECS[type];
			const docs = await this.connection
				.collection(spec.collection)
				.find({ _id: { $in: ids }, ...spec.activeFilter })
				.toArray();
			const byId = new Map(docs.map((d) => [String(d._id), d]));
			for (const h of hits.filter((x) => x.sourceType === type)) {
				const doc = byId.get(String(h.sourceId));
				if (doc) result.push({ source: spec.toSource(doc), text: spec.toText(doc), score: h.score });
			}
		}
		return result.sort((a, b) => b.score - a.score);
	}
}
