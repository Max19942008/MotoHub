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
 * Indexes below are shaped after the queries the app actually issues. Each one
 * names the screen it serves — if that screen goes away, drop the index with it.
 *
 * The old {type, location, title, price} index was replaced: $indexStats showed
 * zero reads against it because every listing query filters on propertyStatus
 * first, which that index did not lead with. (It was also unique, which stopped
 * two sellers from listing the same bike at the same price in the same region.)
 */

/** /property list — match ACTIVE, default sort createdAt DESC */
PropertySchema.index({ propertyStatus: 1, createdAt: -1 });

/** Home page: Top / Popular / Trend blocks each sort a different column */
PropertySchema.index({ propertyStatus: 1, propertyRank: -1 });
PropertySchema.index({ propertyStatus: 1, propertyViews: -1 });
PropertySchema.index({ propertyStatus: 1, propertyLikes: -1 });

/** "My Properties" and any agent's listing tab */
PropertySchema.index({ memberId: 1, propertyStatus: 1, createdAt: -1 });

export default PropertySchema;
