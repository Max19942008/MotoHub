import { Schema } from 'mongoose';
import { PropertyBrand, PropertyCondition, PropertyLocation, PropertyStatus, PropertyType } from '../libs/enums/property.enum';
import { Currency } from '../libs/enums/currency.enum';

const PropertySchema = new Schema(
	{
		propertyType: {
			type: String,
			enum: PropertyType,
			required: true,
		},

		propertyStatus: {
			type: String,
			enum: PropertyStatus,
			default: PropertyStatus.ACTIVE,
		},

		propertyLocation: {
			type: String,
			enum: PropertyLocation,
			required: true,
		},

		propertyBrand: {
    type:String,
		enum:PropertyBrand,
		required: true,
		},

		propertyCondition: {
			type: String,
			enum:PropertyCondition,
			required: true,
		},

		propertyAddress: {
			type: String,
			required: true,
		},

		propertyTitle: {
			type: String,
			required: true,
		},

		propertyPrice: {
			type: Number,
			required: true,
		},

		/** Existing listings were all priced in dollars, hence the default. */
		propertyCurrency: {
			type: String,
			enum: Currency,
			default: Currency.USD,
		},

		propertyYear: {
			type: Number,
			required: true,
		},

		propertyEngineCc: {
			type: Number,
			required: true,
		},

		propertyMileAge: {
    type: Number,
		required: true,
		},

		propertyViews: {
			type: Number,
			default: 0,
		},

		propertyLikes: {
			type: Number,
			default: 0,
		},

		propertyComments: {
			type: Number,
			default: 0,
		},

		propertyRank: {
			type: Number,
			default: 0,
		},

		propertyImages: {
			type: [String],
			required: true,
		},

		propertyDesc: {
			type: String,
		},

		propertyBarter: {
			type: Boolean,
			default: false,
		},

		propertyRent: {
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

		producedAt: {
			type: Date,
		},
	},
	{ timestamps: true, collection: 'properties' },
);

/**
 * Lookup index only — deliberately NOT unique.
 *
 * It used to be unique on {type, location, title, price}, which meant two
 * different sellers could not list the same bike at the same price in the same
 * region, and a soft-deleted listing kept its own slot forever so the owner
 * could never re-post it. Mirrors the Part index, which was always plain.
 *
 * NOTE: dropping `unique` here does not drop the existing index in MongoDB.
 * Run once against the prod database:
 *   db.properties.dropIndex('propertyType_1_propertyLocation_1_propertyTitle_1_propertyPrice_1')
 */
PropertySchema.index({ propertyType: 1, propertyLocation: 1, propertyTitle: 1, propertyPrice: 1, memberId: 1 });

export default PropertySchema;
