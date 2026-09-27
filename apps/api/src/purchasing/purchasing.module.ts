import { Module } from '@nestjs/common';

import { PurchaseRequestController } from './purchase-request.controller.js';
import { PurchaseRequestService } from './purchase-request.service.js';

import { SupplierQuotationController } from './supplier-quotation.controller.js';
import { SupplierQuotationService } from './supplier-quotation.service.js';

import { PurchaseOrderController } from './purchase-order.controller.js';
import { PurchaseOrderService } from './purchase-order.service.js';

import { ReceivingController } from './receiving.controller.js';
import { ReceivingService } from './receiving.service.js';

import { PurchaseInvoiceController } from './purchase-invoice.controller.js';
import { PurchaseInvoiceService } from './purchase-invoice.service.js';

import { AccountsPayableController } from './accounts-payable.controller.js';
import { AccountsPayableService } from './accounts-payable.service.js';

import { SupplierPaymentService } from './supplier-payment.service.js';
import { SupplierPaymentController } from './supplier-payment.controller.js';

import { CashBankAccountController } from './cash-bank-account.controller.js';
import { CashBankAccountService } from './cash-bank-account.service.js';

import { PaymentVoucherController } from './payment-voucher.controller.js';
import { PaymentVoucherService } from './payment-voucher.service.js';

@Module({
  controllers: [
    PurchaseRequestController,
    SupplierQuotationController,
    PurchaseOrderController,
    ReceivingController,
    PurchaseInvoiceController,
    AccountsPayableController,
    SupplierPaymentController,
    CashBankAccountController,
    PaymentVoucherController,
  ],
  providers: [
    PurchaseRequestService,
    SupplierQuotationService,
    PurchaseOrderService,
    ReceivingService,
    PurchaseInvoiceService,
    AccountsPayableService,
    SupplierPaymentService,
    CashBankAccountService,
    PaymentVoucherService,
  ],
})
export class PurchasingModule {}
