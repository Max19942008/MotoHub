import { Schema } from 'mongoose';

/**
 * The parts twin of Interest — a buyer telling the seller they want this part.
 * Same rules: it reaches a person the moment it is filed, so it is recorded
 * rather than toggled and the unique index makes a second tap a no-op.
 *
 * It lives in its own collection rather than joining `interests` because that
 * collection already carries a plain unique index on {memberId, propertyId}.
 * A part row has no propertyId, Mongo indexes the missing field as null, and a
 * member's second part interest would collide with their first. Reusing the
 * collection would mean dropping that index on a live database by hand; a
 * separate collection needs no migration and mirrors how Property and Part are
 * kept apart everywhere else in this codebase.
 */
const PartInterestSchema = new Schema(
	{
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		partId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Part',
		},
	},
	{ timestamps: true, collection: 'partInterests' },
);

/** Both the duplicate guard and the lookup behind `meInterested`. */
PartInterestSchema.index({ memberId: 1, partId: 1 }, { unique: true });

export default PartInterestSchema;
