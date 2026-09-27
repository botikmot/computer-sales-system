import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateReceivingDto } from './dto/create-receiving.dto.js';
import { VerifyReceivingDto } from './dto/verify-receiving.dto.js';

import type { ReceivingWithRelations } from './receiving.types.js';

import { ReceivingService } from './receiving.service.js';

@Controller('receivings')
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Post()
  create(@Body() dto: CreateReceivingDto): Promise<ReceivingWithRelations> {
    return this.receivingService.create(dto);
  }

  @Get()
  findAll(): Promise<ReceivingWithRelations[]> {
    return this.receivingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ReceivingWithRelations> {
    return this.receivingService.findOne(id);
  }

  @Post(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyReceivingDto,
  ): Promise<ReceivingWithRelations> {
    return this.receivingService.verify(id, dto);
  }

  @Post(':id/post')
  post(@Param('id') id: string): Promise<ReceivingWithRelations> {
    return this.receivingService.post(id);
  }
}
