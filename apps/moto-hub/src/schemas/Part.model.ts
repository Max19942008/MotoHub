import { Schema } from 'mongoose';
import {
	PartBrand,
	PartCategory,
	PartCondition,
	PartLocation,
	PartStatus,
	PartType,
} from '../libs/enums/part.enum';

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

PartSchema.index({ partCategory: 1, partType: 1, partTitle: 1, partPrice: 1, memberId: 1 });

export default PartSchema;
