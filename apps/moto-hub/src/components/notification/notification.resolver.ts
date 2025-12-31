import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { NotificationService } from './notification.service';
import { Notifications } from '../../libs/dto/notification/notification';
import {
  NotificationInquiry,
  NotificationReadInput,
} from '../../libs/dto/notification/notification.input';

@Resolver()
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard)
  @Query(() => Notifications)
  async getNotifications(
    @Args('input') input: NotificationInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Notifications> {
    return this.notificationService.getNotifications(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Boolean)
  async markNotificationsRead(
    @Args('input', { nullable: true }) input: NotificationReadInput,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<boolean> {
    return this.notificationService.markNotificationsRead(memberId, input);
  }
}

