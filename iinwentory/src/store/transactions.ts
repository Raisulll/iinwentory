import type { ActivityLogEntry } from "../types";
import { fetchActivityLog, fetchActivityLogPage } from "./activityLog";

interface TransactionPage {
  items: ActivityLogEntry[];
  nextCursor: string | null;
}

/**
 * Fetch a single page of transactions.
 */
export async function fetchTransactionsPage(
  opts: {
    itemId?: string;
    cursor?: string | null;
    limit?: number;
  } = {},
): Promise<TransactionPage> {
  return fetchActivityLogPage(opts);
}

/**
 * Fetch every transaction (backed by the activity log so the item-detail view
 * sees the same exact list that powers the activity timeline).
 */
export async function fetchTransactions(
  itemId?: string,
): Promise<ActivityLogEntry[]> {
  return fetchActivityLog(itemId);
}
