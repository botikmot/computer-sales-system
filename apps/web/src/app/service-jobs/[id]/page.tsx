"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Package,
  PlayCircle,
  ReceiptText,
  Save,
  Stethoscope,
  UserRound,
  UserCog,
  Wrench,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  approveServiceJob,
  cancelServiceJob,
  completeServiceJob,
  diagnoseServiceJob,
  getServiceJob,
  getServiceJobTechnicians,
  assignServiceTechnician,
  startServiceJob,
  type ServiceJob,
  type ServiceJobStatus,
  type ServiceJobTechnician,
} from "@/features/service-repair/service-jobs-api";

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/* function formatDate(value?: string | null) {
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
  }).format(date);
} */

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

function formatStatus(status: ServiceJobStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClasses(status: ServiceJobStatus) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-500";

    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700";

    case "APPROVED":
      return "bg-violet-50 text-violet-700";

    case "AWAITING_APPROVAL":
      return "bg-amber-50 text-amber-700";

    case "DIAGNOSING":
      return "bg-cyan-50 text-cyan-700";

    case "DRAFT":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getTimelineClass(active: boolean, complete = false) {
  if (complete) {
    return "bg-emerald-500 text-white";
  }

  if (active) {
    return "bg-blue-600 text-white";
  }

  return "bg-slate-100 text-slate-400";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default function ServiceJobDetailPage() {
  const params = useParams<{ id: string }>();
  //const router = useRouter();

  const currentUser = getCurrentUser();
  const role = currentUser?.role;

  const canApprove = role === "ADMIN" || role === "MANAGER" || role === "SALES";

  const canDiagnose =
    role === "ADMIN" || role === "MANAGER" || role === "TECHNICIAN";

  const canAssignTechnician = role === "ADMIN" || role === "MANAGER";

  const canStart =
    role === "ADMIN" || role === "MANAGER" || role === "TECHNICIAN";

  const canComplete =
    role === "ADMIN" || role === "MANAGER" || role === "TECHNICIAN";

  const canCancel = role === "ADMIN" || role === "MANAGER";

  const [job, setJob] = useState<ServiceJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState<
    "approve" | "start" | "complete" | "cancel" | "diagnose" | null
  >(null);

  const [diagnoseOpen, setDiagnoseOpen] = useState(false);
  const [diagnosticFindings, setDiagnosticFindings] = useState("");
  const [laborCharge, setLaborCharge] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [technicians, setTechnicians] = useState<ServiceJobTechnician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [technicianLoading, setTechnicianLoading] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const jobId = params.id;

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    async function loadJob() {
      try {
        const result = await getServiceJob(jobId);

        if (cancelled) return;

        setJob(result);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "Unable to load service job.",
        );
        setLoading(false);
      }
    }

    void loadJob();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function refreshJob() {
    const result = await getServiceJob(jobId);
    setJob(result);
  }

  function openDiagnosisForm() {
    if (!job) return;

    setDiagnosticFindings(job.diagnosticFindings ?? "");
    setLaborCharge(
      Number(job.laborCharge || 0) > 0
        ? Number(job.laborCharge).toFixed(2)
        : "",
    );
    setDiagnosisNotes(job.notes ?? "");
    setError("");
    setDiagnoseOpen(true);
  }

  function closeDiagnosisForm() {
    if (actionLoading === "diagnose") return;

    setDiagnoseOpen(false);
  }

  async function handleDiagnoseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!job) return;

    const findings = diagnosticFindings.trim();
    const numericLaborCharge = Number(laborCharge);

    if (!findings) {
      setError("Diagnostic findings are required.");
      return;
    }

    if (!Number.isFinite(numericLaborCharge) || numericLaborCharge < 0) {
      setError("Labor charge must be zero or greater.");
      return;
    }

    try {
      setActionLoading("diagnose");
      setError("");

      await diagnoseServiceJob(job.id, {
        diagnosticFindings: findings,
        laborCharge: numericLaborCharge,
        notes: diagnosisNotes.trim() || undefined,
      });

      await refreshJob();

      setDiagnoseOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save service diagnosis.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function openAssignTechnician() {
    if (!job) return;

    try {
      setTechnicianLoading(true);
      setError("");

      const result = await getServiceJobTechnicians(job.id);

      setTechnicians(result);
      setSelectedTechnicianId(job.technician?.id ?? "");
      setAssignOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load available technicians.",
      );
    } finally {
      setTechnicianLoading(false);
    }
  }

  function closeAssignTechnician() {
    if (assignSubmitting) return;

    setAssignOpen(false);
  }

  async function handleAssignTechnician(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!job || !selectedTechnicianId) {
      setError("Please select a technician.");
      return;
    }

    try {
      setAssignSubmitting(true);
      setError("");

      await assignServiceTechnician(job.id, {
        technicianId: selectedTechnicianId,
      });

      await refreshJob();

      setAssignOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to assign technician.",
      );
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function runAction(
    action: "approve" | "start" | "complete" | "cancel",
  ) {
    if (!job) return;

    try {
      setActionLoading(action);
      setError("");

      if (action === "approve") {
        await approveServiceJob(job.id);
      } else if (action === "start") {
        await startServiceJob(job.id);
      } else if (action === "complete") {
        await completeServiceJob(job.id);
      } else {
        await cancelServiceJob(job.id);
      }

      await refreshJob();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Unable to ${action} service job.`,
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="px-6 py-8">
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading service job...
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="px-6 py-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />

              <div>
                <h2 className="text-sm font-semibold text-rose-800">
                  Unable to load service job
                </h2>

                <p className="mt-1 text-sm text-rose-700">
                  {error || "Service job was not found."}
                </p>

                <Link
                  href="/service-jobs"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Service Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const totalPartsCost = job.parts.reduce(
    (sum, part) => sum + Number(part.totalCost || 0),
    0,
  );

  const repairTotal = Number(job.laborCharge || 0) + totalPartsCost;

  const isCompleted = job.status === "COMPLETED";
  const isCancelled = job.status === "CANCELLED";

  const statusOrder: ServiceJobStatus[] = [
    "DRAFT",
    "DIAGNOSING",
    "AWAITING_APPROVAL",
    "APPROVED",
    "IN_PROGRESS",
    "COMPLETED",
  ];

  const currentStatusIndex = statusOrder.indexOf(job.status);

  return (
    <AppShell>
      <div className="">
        <div className="">
          <div className="mb-6">
            <Link
              href="/service-jobs"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Service Jobs
            </Link>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Service job action failed</p>

                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {diagnoseOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
              <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                      <Stethoscope className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Service Diagnosis
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Record the diagnostic findings and labor charge.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeDiagnosisForm}
                    disabled={actionLoading === "diagnose"}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Close diagnosis form"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleDiagnoseSubmit}>
                  <div className="space-y-5 px-6 py-6">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Diagnostic Findings{" "}
                        <span className="text-red-500">*</span>
                      </span>

                      <textarea
                        value={diagnosticFindings}
                        onChange={(event) =>
                          setDiagnosticFindings(event.target.value)
                        }
                        maxLength={5000}
                        rows={6}
                        disabled={actionLoading === "diagnose"}
                        placeholder="Describe the problem found, affected component, and recommended repair..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      <p className="mt-2 text-right text-xs text-slate-400">
                        {diagnosticFindings.length}/5000
                      </p>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Labor Charge <span className="text-red-500">*</span>
                      </span>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                          ₱
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={laborCharge}
                          onChange={(event) =>
                            setLaborCharge(event.target.value)
                          }
                          disabled={actionLoading === "diagnose"}
                          placeholder="0.00"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Enter the labor/service charge for the repair.
                      </p>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Diagnosis Notes
                      </span>

                      <textarea
                        value={diagnosisNotes}
                        onChange={(event) =>
                          setDiagnosisNotes(event.target.value)
                        }
                        maxLength={1000}
                        rows={4}
                        disabled={actionLoading === "diagnose"}
                        placeholder="Optional notes about the diagnosis..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      <p className="mt-2 text-right text-xs text-slate-400">
                        {diagnosisNotes.length}/1000
                      </p>
                    </label>

                    <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                      <p className="text-sm font-semibold text-cyan-900">
                        After saving diagnosis
                      </p>

                      <p className="mt-1 text-sm leading-6 text-cyan-800">
                        The service job will move to{" "}
                        <span className="font-semibold">AWAITING APPROVAL</span>
                        . Customer approval can then be recorded before the
                        repair starts.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeDiagnosisForm}
                      disabled={actionLoading === "diagnose"}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        actionLoading === "diagnose" ||
                        !diagnosticFindings.trim()
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === "diagnose" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      {actionLoading === "diagnose"
                        ? "Saving Diagnosis..."
                        : "Save Diagnosis"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Services</p>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {job.jobNo}
                </h1>

                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                    job.status,
                  )}`}
                >
                  {job.status === "COMPLETED" && (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  )}

                  {formatStatus(job.status)}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Service and repair job details.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {canDiagnose &&
                (job.status === "DRAFT" || job.status === "DIAGNOSING") && (
                  <button
                    type="button"
                    onClick={openDiagnosisForm}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Stethoscope className="h-4 w-4" />
                    {job.status === "DIAGNOSING"
                      ? "Update Diagnosis"
                      : "Diagnose"}
                  </button>
                )}

              {canAssignTechnician &&
                (job.status === "DRAFT" ||
                  job.status === "AWAITING_APPROVAL") && (
                  <button
                    type="button"
                    onClick={() => void openAssignTechnician()}
                    disabled={actionLoading !== null || technicianLoading}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {technicianLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCog className="h-4 w-4" />
                    )}

                    {job.technician
                      ? "Reassign Technician"
                      : "Assign Technician"}
                  </button>
                )}

              {canApprove && job.status === "AWAITING_APPROVAL" && (
                <button
                  type="button"
                  onClick={() => void runAction("approve")}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve
                </button>
              )}

              {canStart && job.status === "APPROVED" && (
                <button
                  type="button"
                  onClick={() => void runAction("start")}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "start" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Start Repair
                </button>
              )}

              {canComplete && job.status === "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={() => void runAction("complete")}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "complete" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Complete Job
                </button>
              )}

              {job.status === "COMPLETED" && !job.invoice && (
                <Link
                  href={`/service-jobs/${job.id}/invoice`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <ReceiptText className="h-4 w-4" />
                  Generate Service Invoice
                </Link>
              )}

              {canCancel && !isCompleted && !isCancelled && (
                <button
                  type="button"
                  onClick={() => void runAction("cancel")}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "cancel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Cancel
                </button>
              )}
            </div>
          </section>

          {assignOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
              <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <UserCog className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Assign Technician
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Select an active technician for this service job.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeAssignTechnician}
                    disabled={assignSubmitting}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Close technician assignment"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAssignTechnician}>
                  <div className="space-y-5 px-6 py-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Service Job
                      </p>

                      <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                        {job.jobNo}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {job.branch.name} ({job.branch.code})
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Technician <span className="text-red-500">*</span>
                      </span>

                      <SearchableSelect
                        value={selectedTechnicianId}
                        onChange={setSelectedTechnicianId}
                        options={technicians.map<SelectOption>(
                          (technician) => ({
                            value: technician.id,
                            label: technician.fullName,
                            description: `${technician.username} • ${technician.email}`,
                          }),
                        )}
                        placeholder="Search technician..."
                        searchPlaceholder="Search technician..."
                        emptyMessage="No active technician available for this branch."
                        disabled={assignSubmitting}
                      />
                    </label>

                    {selectedTechnicianId && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="text-sm font-semibold text-blue-900">
                          Technician selected
                        </p>

                        <p className="mt-1 text-sm text-blue-800">
                          The selected technician will be assigned to this
                          service job.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeAssignTechnician}
                      disabled={assignSubmitting}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={assignSubmitting || !selectedTechnicianId}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {assignSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}

                      {assignSubmitting ? "Assigning..." : "Assign Technician"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Wrench className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Repair Progress
                </h2>

                <p className="text-sm text-slate-500">
                  Current service job lifecycle
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-[760px] items-start">
                {statusOrder.map((status, index) => {
                  const complete =
                    currentStatusIndex >= index && job.status !== "CANCELLED";

                  const active = job.status === status;

                  return (
                    <div
                      key={status}
                      className="flex min-w-[126px] flex-1 items-start"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold ${getTimelineClass(
                            active,
                            complete && !active,
                          )}`}
                        >
                          {complete && !active ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>

                        <p
                          className={`mt-2 text-[11px] font-semibold ${
                            active ? "text-slate-950" : "text-slate-400"
                          }`}
                        >
                          {formatStatus(status)}
                        </p>
                      </div>

                      {index < statusOrder.length - 1 && (
                        <div
                          className={`mt-4 h-0.5 flex-1 ${
                            currentStatusIndex > index &&
                            job.status !== "CANCELLED"
                              ? "bg-emerald-300"
                              : "bg-slate-100"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {job.status === "CANCELLED" && (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <XCircle className="h-4 w-4" />
                This service job has been cancelled.
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Customer & Job Information
                  </h2>

                  <p className="text-sm text-slate-500">
                    Customer, branch, technician, and service notes
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <DetailItem
                  label="Customer"
                  value={job.customer.name || job.customer.code}
                />

                <DetailItem label="Customer Code" value={job.customer.code} />

                <DetailItem
                  label="Branch"
                  value={`${job.branch.name} (${job.branch.code})`}
                />

                <DetailItem
                  label="Technician"
                  value={
                    job.technician ? (
                      <span className="inline-flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-slate-400" />
                        {job.technician.fullName}
                      </span>
                    ) : (
                      "Unassigned"
                    )
                  }
                />

                <DetailItem
                  label="Created"
                  value={formatDateTime(job.createdAt)}
                />

                <DetailItem
                  label="Last Updated"
                  value={formatDateTime(job.updatedAt)}
                />

                <DetailItem
                  label="Customer Approved"
                  value={job.customerApproved ? "Yes" : "No"}
                />

                <DetailItem
                  label="Approved At"
                  value={formatDateTime(job.customerApprovedAt)}
                />
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <DetailItem
                  label="Notes"
                  value={job.notes || "No service notes have been recorded."}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Schedule
                  </h2>

                  <p className="text-sm text-slate-500">Repair milestones</p>
                </div>
              </div>

              <div className="space-y-4">
                <DetailItem
                  label="Started"
                  value={formatDateTime(job.startedAt)}
                />

                <DetailItem
                  label="Completed"
                  value={formatDateTime(job.completedAt)}
                />

                <DetailItem
                  label="Customer Approved"
                  value={formatDateTime(job.customerApprovedAt)}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                    <Package className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Repair Parts
                    </h2>

                    <p className="text-sm text-slate-500">
                      Required and issued inventory parts
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {job.parts.length} part
                  {job.parts.length === 1 ? "" : "s"}
                </span>
              </div>

              {job.parts.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Product
                        </th>

                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Required
                        </th>

                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Issued
                        </th>

                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Unit Cost
                        </th>

                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Total Cost
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {job.parts.map((part) => (
                        <tr key={part.id}>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {part.product.name}
                            </p>

                            <p className="mt-1 font-mono text-[11px] text-slate-400">
                              {part.product.sku}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">
                            {part.requiredQuantity}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
                                part.issuedQuantity >= part.requiredQuantity
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {part.issuedQuantity}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm text-slate-700">
                            {formatCurrency(part.unitCost)}
                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-slate-800">
                            {formatCurrency(part.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
                  <Package className="h-7 w-7 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No repair parts added
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Required parts will appear here.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Repair Cost
                  </h2>

                  <p className="text-sm text-slate-500">
                    Current service job cost
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <DetailItem
                  label="Labor Charge"
                  value={formatCurrency(job.laborCharge)}
                />

                <DetailItem
                  label="Parts Cost"
                  value={formatCurrency(totalPartsCost)}
                />

                <div className="border-t border-slate-100 pt-4">
                  <DetailItem
                    label="Estimated Repair Total"
                    value={
                      <span className="text-lg font-bold text-slate-950">
                        {formatCurrency(repairTotal)}
                      </span>
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Service Invoice
                  </h2>

                  <p className="text-sm text-slate-500">
                    Billing generated from this service job
                  </p>
                </div>
              </div>

              {job.invoice ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                  <DetailItem
                    label="Invoice No."
                    value={
                      <Link
                        href={`/service-invoices/${job.invoice.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:text-blue-700"
                      >
                        {job.invoice.invoiceNo}
                      </Link>
                    }
                  />

                  <DetailItem label="Status" value={job.invoice.status} />

                  <DetailItem
                    label="Payment Mode"
                    value={job.invoice.paymentMode}
                  />

                  <DetailItem
                    label="Invoice Total"
                    value={formatCurrency(job.invoice.total)}
                  />

                  <DetailItem
                    label="Balance Due"
                    value={formatCurrency(job.invoice.balanceDue)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  <ReceiptText className="h-4 w-4 text-slate-400" />
                  No service invoice has been generated yet.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:col-span-3">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-slate-500" />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Branch-controlled service job
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This job belongs to{" "}
                    <span className="font-semibold">{job.branch.name}</span> and
                    all repair operations are restricted by branch access.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
