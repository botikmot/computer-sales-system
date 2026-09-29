import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { PettyCashService } from './petty-cash.service.js';

import { CreatePettyCashFundDto } from './dto/create-petty-cash-fund.dto.js';
import { CreatePettyCashVoucherDto } from './dto/create-petty-cash-voucher.dto.js';
import { CreatePettyCashReplenishmentDto } from './dto/create-petty-cash-replenishment.dto.js';

@Controller('petty-cash')
export class PettyCashController {
  constructor(private readonly pettyCashService: PettyCashService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('funds')
  createFund(@Body() dto: CreatePettyCashFundDto) {
    return this.pettyCashService.createFund(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('funds')
  findFunds(@Query('branchId') branchId?: string) {
    return this.pettyCashService.findFunds(branchId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('funds/:id')
  findFund(@Param('id') id: string) {
    return this.pettyCashService.findFund(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('funds/:fundId/vouchers')
  createVoucher(
    @Param('fundId') fundId: string,
    @Body() dto: CreatePettyCashVoucherDto,
  ) {
    return this.pettyCashService.createVoucher(fundId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('vouchers/:id/post')
  postVoucher(@Param('id') id: string) {
    return this.pettyCashService.postVoucher(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('vouchers/:id/void')
  voidVoucher(@Param('id') id: string) {
    return this.pettyCashService.voidVoucher(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('funds/:fundId/vouchers')
  findVouchers(@Param('fundId') fundId: string) {
    return this.pettyCashService.findVouchers(fundId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('funds/:fundId/replenishments')
  createReplenishment(
    @Param('fundId') fundId: string,
    @Body() dto: CreatePettyCashReplenishmentDto,
  ) {
    return this.pettyCashService.createReplenishment(fundId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('replenishments/:id/post')
  postReplenishment(@Param('id') id: string) {
    return this.pettyCashService.postReplenishment(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('funds/:fundId/replenishments')
  findReplenishments(@Param('fundId') fundId: string) {
    return this.pettyCashService.findReplenishments(fundId);
  }
}
