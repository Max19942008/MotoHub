import { Schema } from 'mongoose';
import {
	PartBrand,
	PartCategory,
	PartCondition,
	PartLocation,
	PartStatus,
	PartType,
} from '../libs/enums/part.enum';
import { Currency } from '../libs/enums/currency.enum';

const PartSchema = new Schema(
	{
		partCategory: {
			type: String,
			enum: PartCategory,
			required: true,
		},

		partType: {
			type: String,
			enum: PartType,
			required: true,
		},

		partStatus: {
			type: String,
			enum: PartStatus,
			default: PartStatus.ACTIVE,
		},

		partLocation: {
			type: String,
			enum: PartLocation,
			required: true,
		},

		partBrand: {
			type: String,
			enum: PartBrand,
			required: true,
		},

		partCondition: {
			type: String,
			enum: PartCondition,
			required: true,
		},

		partTitle: {
			type: String,
			required: true,
		},

		partPrice: {
			type: Number,
			required: true,
		},

		/** Existing listings were all priced in dollars, hence the default. */
		partCurrency: {
			type: String,
			enum: Currency,
			default: Currency.USD,
		},

		partStockCount: {
			type: Number,
			default: 1,
		},

		/** Motorbike brands this part / accessory fits */
		partCompatibleBrands: {
			type: [String],
			enum: PartBrand,
			default: [],
		},

		partViews: {
			type: Number,
			default: 0,
		},

		partLikes: {
			type: Number,
			default: 0,
		},

		partComments: {
			type: Number,
			default: 0,
		},

		partRank: {
			type: Number,
			default: 0,
		},

		partImages: {
			type: [String],
			required: true,
		},

		partDesc: {
			type: String,
		},

		partBarter: {
			type: Boolean,
			default: false,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		soldAt: {
			type: Date,
		},

		deletedAt: {
			type: Date,
		},
	},
	{ timestamps: true, collection: 'parts' },
);

/**
 * Shaped after the real queries, same as Property. The old
 * {category, type, title, price, memberId} index read zero times in
 * $indexStats — partStatus leads every listing query and it was not in there.
 */

/** /part list — match ACTIVE (+ category filter), default sort createdAt DESC */
PartSchema.index({ partStatus: 1, partCategory: 1, createdAt: -1 });

/** Home page: Top Spare Parts and Top Accessories, both sorted by partRank */
PartSchema.index({ partStatus: 1, partCategory: 1, partRank: -1 });

/** "My Parts" and any agent's parts tab */
PartSchema.index({ memberId: 1, partStatus: 1, createdAt: -1 });

export default PartSchema;
