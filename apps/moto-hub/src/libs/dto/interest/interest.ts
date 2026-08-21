import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';

/**
 * Shaped like MeLiked so the clients can read it the same way: an empty list
 * means this member has not registered interest yet, one entry means they have.
 */
@ObjectType()
export class MeInterested {
	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	propertyId: ObjectId;

	@Field(() => Boolean)
	myInterest: boolean;
}
