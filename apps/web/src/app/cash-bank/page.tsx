"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Search,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getCashBankAccounts,
  getCashBankAccountBalance,
  type CashBankAccount,
} from "@/features/cash-bank/cash-bank-accounts-api";
import {
  getCashBankTransactions,
  type CashBankTransaction,
  type CashBankTransactionDirection,
  type CashBankTransactionSortField,
  type CashBankTransactionType,
} from "@/features/cash-bank/cash-bank-transactions-api";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

const directionOptions: SelectOption[] = [
  {
    value: "",
    label: "All Directions",
  },
  {
    value: "IN",
    label: "Money In",
  },
  {
    value: "OUT",
    label: "Money Out",
  },
];

const transactionTypeOptions: SelectOption[] = [
  {
    value: "",
    label: "All Transaction Types",
  },
  {
    value: "CUSTOMER_PAYMENT",
    label: "Customer Payment",
  },
  {
    value: "SUPPLIER_PAYMENT",
    label: "Supplier Payment",
  },
  {
    value: "CUSTOMER_REFUND",
    label: "Customer Refund",
  },
  {
    value: "PETTY_CASH_REPLENISHMENT",
    label: "Petty Cash Replenishment",
  },
  {
    value: "OTHER_RECEIPT",
    label: "Other Receipt",
  },
  {
    value: "EXPENSE",
    label: "Expense",
  },
];

const sortOptions: SelectOption[] = [
  {
    value: "transactionDate",
    label: "Transaction Date",
  },
  {
    value: "accountName",
    label: "Account",
  },
  {
    value: "transactionType",
    label: "Transaction Type",
  },
  {
    value: "direction",
    label: "Direction",
  },
  {
    value: "amount",
    label: "Amount",
  },
  {
    value: "createdAt",
    label: "Created Date",
  },
  {
    value: "updatedAt",
    label: "Updated Date",
  },
];

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatAccountType(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTransactionType(value: CashBankTransactionType) {
  switch (value) {
    case "CUSTOMER_PAYMENT":
      return "Customer Payment";

    case "SUPPLIER_PAYMENT":
      return "Supplier Payment";

    case "CUSTOMER_REFUND":
      return "Customer Refund";

    case "PETTY_CASH_REPLENISHMENT":
      return "Petty Cash Replenishment";

    case "OTHER_RECEIPT":
      return "Other Receipt";

    case "EXPENSE":
      return "Expense";

    default:
      return value;
  }
}

function getDirectionClass(direction: CashBankTransactionDirection) {
  return direction === "IN"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";
}

function getTransactionTypeClass(type: CashBankTransactionType) {
  switch (type) {
    case "CUSTOMER_PAYMENT":
      return "bg-emerald-50 text-emerald-700";

    case "SUPPLIER_PAYMENT":
      return "bg-amber-50 text-amber-700";

    case "CUSTOMER_REFUND":
      return "bg-rose-50 text-rose-700";

    case "PETTY_CASH_REPLENISHMENT":
      return "bg-violet-50 text-violet-700";

    case "OTHER_RECEIPT":
      return "bg-blue-50 text-blue-700";

    case "EXPENSE":
      return "bg-slate-100 text-slate-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

type AccountWithBalance = CashBankAccount & {
  currentBalance: string;
};

function AccountCard({ account }: { account: AccountWithBalance }) {
  const isCash = account.accountType === "CASH";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isCash
                ? "bg-emerald-50 text-emerald-600"
                : "bg-blue-50 text-blue-600",
            ].join(" ")}
          >
            {isCash ? (
              <Banknote className="h-5 w-5" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {account.name}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              {formatAccountType(account.accountType)}
            </p>
          </div>
        </div>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            account.isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {account.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Current Balance
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {formatCurrency(account.currentBalance)}
        </p>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Account Number</span>

          <span className="font-mono font-semibold text-slate-700">
            {account.accountNumber || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CashBankPage() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);

  const [transactions, setTransactions] = useState<CashBankTransaction[]>([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [direction, setDirection] = useState<CashBankTransactionDirection | "">(
    "",
  );

  const [transactionType, setTransactionType] = useState<
    CashBankTransactionType | ""
  >("");

  const [accountId, setAccountId] = useState("");

  const [sortBy, setSortBy] =
    useState<CashBankTransactionSortField>("transactionDate");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [accountsLoading, setAccountsLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        setAccountsLoading(true);

        const result = await getCashBankAccounts();

        if (cancelled) {
          return;
        }

        const accountsWithBalances = await Promise.all(
          result.map(async (account) => {
            try {
              const balance = await getCashBankAccountBalance(account.id);

              return {
                ...account,
                currentBalance: String(balance.currentBalance),
              };
            } catch {
              return {
                ...account,
                currentBalance: String(account.openingBalance),
              };
            }
          }),
        );

        if (cancelled) {
          return;
        }

        setAccounts(accountsWithBalances);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load cash and bank accounts.",
          );
        }
      } finally {
        if (!cancelled) {
          setAccountsLoading(false);
        }
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        setTransactionsLoading(true);

        const result = await getCashBankTransactions({
          page,
          limit: PAGE_SIZE,
          search: activeSearch || undefined,
          direction: direction || undefined,
          transactionType: transactionType || undefined,
          accountId: accountId || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setTransactions(result.items);
        setPages(result.pagination.pages);
        setTotal(result.pagination.total);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load cash and bank transactions.",
          );
        }
      } finally {
        if (!cancelled) {
          setTransactionsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    activeSearch,
    direction,
    transactionType,
    accountId,
    sortBy,
    sortOrder,
  ]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setActiveSearch(search.trim());
    setPage(1);
  }

  function handleDirectionChange(value: string) {
    setDirection(value as CashBankTransactionDirection | "");
    setPage(1);
  }

  function handleTransactionTypeChange(value: string) {
    setTransactionType(value as CashBankTransactionType | "");
    setPage(1);
  }

  function handleAccountChange(value: string) {
    setAccountId(value);
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSortBy(value as CashBankTransactionSortField);
    setPage(1);
  }

  function toggleSortOrder() {
    setSortOrder((current) => (current === "desc" ? "asc" : "desc"));

    setPage(1);
  }

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > pages || targetPage === page) {
      return;
    }

    setPage(targetPage);
  }

  const totalCash = accounts
    .filter((account) => account.accountType === "CASH")
    .reduce((sum, account) => sum + Number(account.currentBalance), 0);

  const totalBank = accounts
    .filter((account) => account.accountType === "BANK")
    .reduce((sum, account) => sum + Number(account.currentBalance), 0);

  const totalAvailable = totalCash + totalBank;

  const accountOptions: SelectOption[] = [
    {
      value: "",
      label: "All Accounts",
    },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.name,
      description: `${formatAccountType(account.accountType)} • ${account.branchId}`,
    })),
  ];

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* HEADER */}
        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Finance</p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Cash &amp; Bank
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor cash and bank balances and review every financial
                movement.
              </p>
            </div>

            <Link
              href="/cash-bank/accounts/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </Link>
          </div>
        </section>

        {/* BALANCE SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Total Cash
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {formatCurrency(totalCash)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Banknote className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Total Bank
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {formatCurrency(totalBank)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Total Available
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {formatCurrency(totalAvailable)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>
          </div>
        </section>

        {/* ACCOUNTS */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <WalletCards className="h-5 w-5 text-primary" />

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Cash &amp; Bank Accounts
              </h2>

              <p className="text-sm text-slate-500">
                Current balances by account.
              </p>
            </div>
          </div>

          {accountsLoading ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading accounts...
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <WalletCards className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-900">
                No cash or bank accounts found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create an account before recording cash or bank activity.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Cash &amp; Bank warning
                </p>

                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* TRANSACTION LEDGER */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Transaction Ledger
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {showingFrom}–{showingTo} of {total} transactions
                </p>
              </div>

              {transactionsLoading && (
                <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </div>

          {/* FILTERS */}
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <form
                onSubmit={handleSearch}
                className="flex w-full gap-2 xl:max-w-md"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search account, reference, or notes..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Search
                </button>
              </form>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-center">
                <SearchableSelect
                  value={direction}
                  onChange={handleDirectionChange}
                  options={directionOptions}
                  placeholder="Direction"
                  searchPlaceholder="Search direction..."
                  emptyMessage="No direction found."
                  className="min-w-[165px]"
                />

                <SearchableSelect
                  value={transactionType}
                  onChange={handleTransactionTypeChange}
                  options={transactionTypeOptions}
                  placeholder="Transaction type"
                  searchPlaceholder="Search transaction type..."
                  emptyMessage="No transaction type found."
                  className="min-w-[220px]"
                />

                <SearchableSelect
                  value={accountId}
                  onChange={handleAccountChange}
                  options={accountOptions}
                  placeholder="Account"
                  searchPlaceholder="Search account..."
                  emptyMessage="No account found."
                  className="min-w-[190px]"
                />

                <SearchableSelect
                  value={sortBy}
                  onChange={handleSortChange}
                  options={sortOptions}
                  placeholder="Sort by"
                  searchPlaceholder="Search sort field..."
                  emptyMessage="No sort field found."
                  className="min-w-[180px]"
                />

                <button
                  type="button"
                  onClick={toggleSortOrder}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {sortOrder === "desc" ? (
                    <>
                      <ArrowDown className="h-4 w-4" />
                      Descending
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4" />
                      Ascending
                    </>
                  )}
                </button>
              </div>
            </div>

            {activeSearch && (
              <div className="mt-3 text-xs text-slate-500">
                Searching for{" "}
                <span className="font-semibold text-slate-700">
                  “{activeSearch}”
                </span>
              </div>
            )}
          </div>

          {/* TABLE */}
          {transactionsLoading && transactions.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading transaction ledger...
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <CreditCard className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-900">
                No transactions found
              </p>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No cash or bank transactions match the selected filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Account
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Transaction Type
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Direction
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reference
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Notes
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDateTime(transaction.transactionDate)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {transaction.accountName}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            {formatAccountType(transaction.accountType)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={[
                              "inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold",
                              getTransactionTypeClass(
                                transaction.transactionType,
                              ),
                            ].join(" ")}
                          >
                            {formatTransactionType(transaction.transactionType)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
                              getDirectionClass(transaction.direction),
                            ].join(" ")}
                          >
                            {transaction.direction === "IN" ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUp className="h-3.5 w-3.5" />
                            )}

                            {transaction.direction === "IN" ? "IN" : "OUT"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span
                            className={[
                              "font-mono text-sm font-bold",
                              transaction.direction === "IN"
                                ? "text-emerald-600"
                                : "text-rose-600",
                            ].join(" ")}
                          >
                            {transaction.direction === "IN" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-slate-600">
                            {transaction.referenceNo || "—"}
                          </span>
                        </td>

                        <td className="max-w-[260px] px-5 py-4">
                          <p className="truncate text-sm text-slate-600">
                            {transaction.notes || "—"}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Page {page} of {pages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || transactionsLoading}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= pages || transactionsLoading}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
