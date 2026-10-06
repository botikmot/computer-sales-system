SELECT
  (SELECT COUNT(*) FROM "Branch") AS branches,
  (SELECT COUNT(*) FROM "User") AS users,
  (SELECT COUNT(*) FROM "Customer") AS customers,
  (SELECT COUNT(*) FROM "Supplier") AS suppliers,
  (SELECT COUNT(*) FROM "ProductCategory") AS categories,
  (SELECT COUNT(*) FROM "Product") AS products,
  (SELECT COUNT(*) FROM "BillOfMaterial") AS boms,
  (SELECT COUNT(*) FROM "BillOfMaterialItem") AS bom_items,
  (SELECT COUNT(*) FROM "CashBankAccount") AS cash_bank_accounts,
  (SELECT COUNT(*) FROM "PettyCashFund") AS petty_cash_funds;
