import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { Direction } from '../../enums/common.enum';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../enums/notification.enum';

@InputType()
export class NotificationInput {

		@IsNotEmpty()
	@Field(() => NotificationGroup)
	notificationGroup: NotificationGroup;

	@IsNotEmpty()
	@Field(() => NotificationType)
	notificationType: NotificationType;

	@IsOptional()
	@Field(() => NotificationStatus, { nullable: true })
	notificationStatus?: NotificationStatus;

	@IsNotEmpty()
	@Field(() => String)
	notificationTitle: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	notificationDesc?: string;

	@IsNotEmpty()
	@Field(() => String)
	authorId: ObjectId;

	@IsNotEmpty()
	@Field(() => String)
	receiverId: ObjectId;

	@IsOptional()
	@Field(() => String, { nullable: true })
	propertyId?: ObjectId;

	@IsOptional()
	@Field(() => String, { nullable: true })
	articleId?: ObjectId;

	@IsOptional()
	@Field(() => String, { nullable: true })
	partId?: ObjectId;
}

@InputType()
class NISearch {
	@IsOptional()
	@Field(() => NotificationStatus, { nullable: true })
	status?: NotificationStatus;

	@IsOptional()
	@Field(() => NotificationGroup, { nullable: true })
	group?: NotificationGroup;

	@IsOptional()
	@Field(() => NotificationType, { nullable: true })
	type?: NotificationType;
}

@InputType()
export class NotificationInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => NISearch)
	search: NISearch;
}

@InputType()
export class NotificationReadInput {
	@IsOptional()
	@Field(() => [String], { nullable: true })
	_id?: ObjectId[];
}

@InputType()
export class NotificationDeleteInput {
	@IsOptional()
	@Field(() => [String], { nullable: true })
	_id?: ObjectId;
}
