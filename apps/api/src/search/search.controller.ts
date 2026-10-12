import { Controller, Get, Query } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.searchService.search(query, user);
  }
}
