import { Controller, Get } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('pending-actions')
  getPendingActions(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPendingActions(user);
  }
}
