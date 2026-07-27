import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { NotificationService } from './notification.service';
import { Notifications } from '../../libs/dto/notification/notification';
import {
  NotificationInquiry,
  NotificationDeleteInput,
  NotificationReadInput,
} from '../../libs/dto/notification/notification.input';
import { DeviceTokenInput } from '../../libs/dto/notification/device.input';

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

  /** The app calls this once it has an Expo push token — on login and on app start. */
  @UseGuards(AuthGuard)
  @Mutation(() => Boolean)
  async registerDevice(
    @Args('input') input: DeviceTokenInput,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<boolean> {
    console.log('Mutation: registerDevice');
    return this.notificationService.registerDevice(memberId, input.deviceToken, input.devicePlatform);
  }

  /** Called on logout so the device stops receiving this member's notifications. */
  @UseGuards(AuthGuard)
  @Mutation(() => Boolean)
  async unregisterDevice(
    @Args('deviceToken') deviceToken: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<boolean> {
    console.log('Mutation: unregisterDevice');
    return this.notificationService.unregisterDevice(memberId, deviceToken);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Boolean)
  async deleteNotification(
    @Args('input', { nullable: true }) input: NotificationDeleteInput,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<boolean> {
    return this.notificationService.deleteNotification(memberId, input);
  };

}

