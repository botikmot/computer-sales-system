import { Controller, Get, Param, Post } from '@nestjs/common';

import { AccountsReceivableService } from './accounts-receivable.service.js';

@Controller('sales/accounts-receivable')
export class AccountsReceivableController {
  constructor(
    private readonly accountsReceivableService: AccountsReceivableService,
  ) {}

  @Get()
  findAll() {
    return this.accountsReceivableService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsReceivableService.findOne(id);
  }

  @Post('from-invoice/:salesInvoiceId')
  createFromInvoice(
    @Param('salesInvoiceId')
    salesInvoiceId: string,
  ) {
    return this.accountsReceivableService.createFromInvoice(salesInvoiceId);
  }
}
