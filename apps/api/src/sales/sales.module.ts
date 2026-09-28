import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';

import { SalesInquiryController } from './sales-inquiry.controller.js';
import { SalesInquiryService } from './sales-inquiry.service.js';

import { SalesQuotationController } from './sales-quotation.controller.js';
import { SalesQuotationService } from './sales-quotation.service.js';

import { SalesOrderController } from './sales-order.controller.js';
import { SalesOrderService } from './sales-order.service.js';

import { InventoryReservationController } from './inventory-reservation.controller.js';
import { InventoryReservationService } from './inventory-reservation.service.js';

import { SalesInvoiceController } from './sales-invoice.controller.js';
import { SalesInvoiceService } from './sales-invoice.service.js';

import { CustomerPaymentController } from './customer-payment.controller.js';
import { CustomerPaymentService } from './customer-payment.service.js';

import { AccountsReceivableController } from './accounts-receivable.controller.js';
import { AccountsReceivableService } from './accounts-receivable.service.js';

import { SalesReturnController } from './sales-return.controller.js';
import { SalesReturnService } from './sales-return.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    SalesInquiryController,
    SalesQuotationController,
    SalesOrderController,
    InventoryReservationController,
    SalesInvoiceController,
    CustomerPaymentController,
    AccountsReceivableController,
    SalesReturnController,
  ],
  providers: [
    SalesInquiryService,
    SalesQuotationService,
    SalesOrderService,
    InventoryReservationService,
    SalesInvoiceService,
    CustomerPaymentService,
    AccountsReceivableService,
    SalesReturnService,
  ],
})
export class SalesModule {}
