import { Schema } from 'mongoose';

/**
 * One vector per searchable document (motorbike listing, part, community article).
 * Kept in its own collection so listing queries never drag 1024 floats along.
 *
 * Atlas Vector Search index `ai_vector_index` on this collection is created at
 * startup by RagService (path `embedding`, filter on `sourceType`).
 */
const AiEmbeddingSchema = new Schema(
	{
		sourceType: {
			type: String,
			enum: ['PROPERTY', 'PART', 'ARTICLE'],
			required: true,
		},

		sourceId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		/** The exact text that was embedded — handy for debugging retrieval. */
		text: {
			type: String,
			required: true,
		},

		embedding: {
			type: [Number],
			required: true,
		},

		/** Embedding model name; a model change forces a full re-embed. */
		model: {
			type: String,
			required: true,
		},

		/** source.updatedAt at embed time; a newer source means re-embed. */
		sourceUpdatedAt: {
			type: Date,
			required: true,
		},
	},
	{ timestamps: true, collection: 'ai_embeddings' },
);

AiEmbeddingSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });

export default AiEmbeddingSchema;
