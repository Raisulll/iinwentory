export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  parentId: string | null;
  sku: string | null;
  description: string | null;
  weight: number | null;
  dimensions: Record<string, unknown> | null;
  location: string | null;
  quantity: number;
  unit: string;
  minLevel: number | null;
  minQuantity: number;
  price: number;
  sellPrice: number | null;
  costPrice: number | null;
  customFields: Record<string, unknown>;
  notes: string;
  tags: string[];
  photos: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  description: string;
  icon: string | null;
  sku: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderStats {
  folderId: string;
  subfolderCount: number;
  unitCount: number;
  totalValue: number;
  thumbnails: string[];
}

export interface InventoryState {
  items: InventoryItem[];
  folders: Folder[];
  tags: Tag[];
}

// ====== TEAM ======
export type TeamMemberRole = 'owner' | 'admin' | 'member' | 'client';

export interface TeamMember {
  id: string;
  memberId?: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  inviteCode: string;
  expiresAt: string | null;
  usedBy: string | null;
  createdAt: string | null;
}

export interface ClientFolderAccessGrant {
  id: string;
  userId: string;
  folderId: string;
  grantedBy: string | null;
  grantedAt: string | null;
}

// ====== PICK LISTS (server-backed) ======
export type PickListStatus = 'draft' | 'ready' | 'completed';

export interface PickListItemRow {
  id: string;
  itemId: string;
  requestedQty: number;
  pickedQty: number;
  unitPrice: number | null;
  locationHint: string | null;
  pickedAt: string | null;
  pickedBy: string | null;
  sortOrder: number;
}

export interface PickList {
  id: string;
  code: string;
  name: string;
  status: PickListStatus;
  assignedTo: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  completedAt: string | null;
  items: PickListItemRow[];
}

export interface PickHistoryEntry {
  pickListId: string;
  pickListName: string;
  pickListCode: string;
  itemId: string;
  itemName: string;
  unit: string;
  pickedQty: number;
  pickedAt: string | null;
}

export interface PickListComment {
  id: string;
  pickListId: string;
  userId: string | null;
  userName?: string;
  content: string;
  createdAt: string;
}

export type PickIssueType = 'damaged_stock' | 'missing_unit' | 'wrong_stock_at_location' | 'barcode_mismatch' | 'other';

export interface PickListIssue {
  id: string;
  pickListId: string;
  pickListItemId: string;
  issueType: PickIssueType;
  quantityAffected: number;
  quantityActuallyPicked: number;
  notes: string | null;
  reportedBy: string | null;
  createdAt: string;
}

// ====== PURCHASE ORDERS (server-backed) ======
export interface PurchaseOrderItem {
  id: string;
  itemId: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  receivedAt: string | null;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  name: string;
  supplier: string;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  notes: string | null;
  orderDate: string | null;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ====== STOCK COUNTS (server-backed) ======
export interface StockCountItem {
  id: string;
  itemId: string;
  expectedQuantity: number;
  countedQuantity: number | null;
  difference: number | null;
  countedBy: string | null;
  countedAt: string | null;
  notes: string | null;
}

export type StockCountStatus = 'draft' | 'in_progress' | 'completed';

export interface StockCount {
  id: string;
  name: string;
  items: StockCountItem[];
  status: StockCountStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ====== ACTIVITY LOG ======
export type ActivityAction = 'created' | 'updated' | 'deleted' | 'moved' | 'qty_changed' | 'status_changed';
export type ActivityEntityType = 'item' | 'folder' | 'tag' | 'pick_list' | 'purchase_order' | 'stock_count';

export interface ActivityLogEntry {
  id: string;
  /** Full action type from the server, e.g. "item.created", "pick_list.status_changed". */
  action: string;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  details: Record<string, unknown> | string;
  userId?: string | null;
  timestamp: string;
}

// ====== TRANSACTIONS (immutable audit) ======
export interface TransactionRow {
  id: string;
  itemId: string | null;
  itemName: string | null;
  folderName: string | null;
  transactionType: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  referenceId: string | null;
  referenceType: string | null;
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
}

// ====== NOTIFICATIONS ======
export interface ServerNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  relatedItemId: string | null;
  relatedPickListId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ====== SETTINGS ======
export interface AppSettings {
  orgName: string;
  userName: string;
  userEmail: string;
  currency: string;
  defaultView: 'grid' | 'list';
  lowStockAlerts: boolean;
  theme: 'light' | 'dark';
}
