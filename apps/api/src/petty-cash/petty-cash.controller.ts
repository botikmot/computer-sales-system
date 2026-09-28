import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { PettyCashService } from './petty-cash.service.js';
import { CreatePettyCashFundDto } from './dto/create-petty-cash-fund.dto.js';
import { CreatePettyCashVoucherDto } from './dto/create-petty-cash-voucher.dto.js';
import { CreatePettyCashReplenishmentDto } from './dto/create-petty-cash-replenishment.dto.js';

@Controller('petty-cash')
export class PettyCashController {
  constructor(private readonly pettyCashService: PettyCashService) {}

  @Post('funds')
  createFund(@Body() dto: CreatePettyCashFundDto) {
    return this.pettyCashService.createFund(dto);
  }

  @Get('funds')
  findFunds(@Query('branchId') branchId?: string) {
    return this.pettyCashService.findFunds(branchId);
  }

  @Get('funds/:id')
  findFund(@Param('id') id: string) {
    return this.pettyCashService.findFund(id);
  }

  @Post('funds/:fundId/vouchers')
  createVoucher(
    @Param('fundId') fundId: string,
    @Body() dto: CreatePettyCashVoucherDto,
  ) {
    return this.pettyCashService.createVoucher(fundId, dto);
  }

  @Post('vouchers/:id/post')
  postVoucher(@Param('id') id: string) {
    return this.pettyCashService.postVoucher(id);
  }

  @Post('vouchers/:id/void')
  voidVoucher(@Param('id') id: string) {
    return this.pettyCashService.voidVoucher(id);
  }

  @Get('funds/:fundId/vouchers')
  findVouchers(@Param('fundId') fundId: string) {
    return this.pettyCashService.findVouchers(fundId);
  }

  @Post('funds/:fundId/replenishments')
  createReplenishment(
    @Param('fundId') fundId: string,
    @Body() dto: CreatePettyCashReplenishmentDto,
  ) {
    return this.pettyCashService.createReplenishment(fundId, dto);
  }

  @Post('replenishments/:id/post')
  postReplenishment(@Param('id') id: string) {
    return this.pettyCashService.postReplenishment(id);
  }

  @Get('funds/:fundId/replenishments')
  findReplenishments(@Param('fundId') fundId: string) {
    return this.pettyCashService.findReplenishments(fundId);
  }
}
