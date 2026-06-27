import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import type { ActivityLogEntry } from "../../types";

interface TransactionsModalProps {
  open: boolean;
  onClose: () => void;
  /** null = still loading, array = loaded (possibly empty). */
  transactions: ReadonlyArray<ActivityLogEntry> | null;
}

type TypeFilter = "all" | "created" | "increased" | "decreased" | "deleted";

function verbOf(action: string): string {
  return action.includes(".") ? (action.split(".").pop() ?? action) : action;
}

function getTransactionFilter(entry: ActivityLogEntry): TypeFilter | "other" {
  const details =
    entry.details && typeof entry.details === "object"
      ? (entry.details as Record<string, unknown>)
      : {};
  const verb = verbOf(entry.action);

  if (verb === "created") return "created";
  if (verb === "deleted") return "deleted";

  if (verb === "qty_changed") {
    const before =
      typeof details.before === "number" ? details.before : undefined;
    const after = typeof details.after === "number" ? details.after : undefined;
    const change =
      typeof details.change === "number" ? details.change : undefined;
    const delta =
      after !== undefined && before !== undefined ? after - before : change;
    if (delta !== undefined) return delta >= 0 ? "increased" : "decreased";
  }

  return "other";
}

function describeTransaction(entry: ActivityLogEntry): string {
  const details =
    entry.details && typeof entry.details === "object"
      ? (entry.details as Record<string, unknown>)
      : {};
  const entityName = entry.entityName || "Record";
  const verb = entry.action.includes(".")
    ? (entry.action.split(".").pop() ?? entry.action)
    : entry.action;
  const before = typeof details.before === "number" ? details.before : null;
  const after = typeof details.after === "number" ? details.after : null;
  const change = typeof details.change === "number" ? details.change : null;
  const reason = typeof details.reason === "string" ? details.reason : null;

  if (verb === "qty_changed" && before !== null && after !== null) {
    return `${entityName} quantity ${before} → ${after}${reason ? ` · ${reason}` : ""}`;
  }
  if (verb === "qty_changed" && change !== null) {
    return `${entityName} quantity ${change > 0 ? "+" : ""}${change}${reason ? ` · ${reason}` : ""}`;
  }

  if (typeof entry.details === "string") return entry.details;
  return `${entityName} ${verb}`;
}

export default function TransactionsModal({
  open,
  onClose,
  transactions,
}: TransactionsModalProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((entry) => {
      if (typeFilter === "all") return true;
      return getTransactionFilter(entry) === typeFilter;
    });
  }, [transactions, typeFilter]);

  const filters: TypeFilter[] = [
    "all",
    "created",
    "increased",
    "decreased",
    "deleted",
  ];
  const filterLabel: Record<TypeFilter, string> = {
    all: "All",
    created: "Created",
    increased: "Increased",
    decreased: "Decreased",
    deleted: "Deleted",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeft size={18} className="rotate-45" /> Transactions
            {transactions && ` (${filteredTransactions.length})`}
          </DialogTitle>
        </DialogHeader>

        {transactions && transactions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                  typeFilter === filter
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => setTypeFilter(filter)}
              >
                {filterLabel[filter]}
              </button>
            ))}
          </div>
        )}

        {transactions === null ? (
          <p className="mt-3 text-[13px] text-muted-foreground">Loading…</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {transactions.length === 0
              ? "No transactions recorded for this item."
              : "No transactions match this filter."}
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="flex flex-col gap-1.5">
              {filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-[13px]"
                >
                  <span>
                    <b className="mr-2 text-[11px] uppercase tracking-wider">
                      {t.action}
                    </b>
                    <span>{describeTransaction(t)}</span>
                  </span>
                  <span className="ml-3 whitespace-nowrap text-[11px] text-muted-foreground">
                    {new Date(t.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
