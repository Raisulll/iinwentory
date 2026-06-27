export interface TutorialStep {
  title: string;
  body: string;
}

export interface Tutorial {
  id: string;
  title: string;
  intro: string;
  steps: TutorialStep[];
  tips?: string[];
}

export const TUTORIALS: Record<string, Tutorial> = {
  'pick-mode': {
    id: 'pick-mode',
    title: 'Pick Mode',
    intro: 'Pick Mode is a fast warehouse-style picker for fulfilling pick lists. Open a pick list by code (or pick from the ready-list), then scan barcodes or type SKUs to pick units one by one. Stock decrements live, picks are recorded with timestamps + user, and the audit trail flows into transactions.',
    steps: [
      { title: 'Mark a pick list ready', body: 'Pick Mode only opens lists in "ready" state. From Workflows → Pick Lists, add items to a draft and click "Mark Ready".' },
      { title: 'Open Pick Mode', body: 'Click "Pick Mode" in the sidebar (or the button at the top of the Pick Lists tab).' },
      { title: 'Enter a code or pick a list', body: 'Type the 6-char code (e.g. PL-A3K9FX) and press Open, or click any list shown under "ready lists".' },
      { title: 'Scan / type SKU to pick +1', body: 'A barcode scanner sends Enter after the SKU — that pick fires automatically. Or use the +1 / Pick all buttons next to each line.' },
      { title: 'Report issues on the fly', body: 'Hit the red ⚠ button when you find damaged stock, missing units, wrong location, barcode mismatch, etc. Optionally adjust inventory in the same step.' },
      { title: 'Complete', body: 'When all lines hit their requested qty, the green Complete button enables. Completing locks the pick list and frees up reserved inventory.' },
    ],
    tips: [
      'Pick Mode runs the same atomic SQL function (public.pick_item) the mobile app uses — no race condition on shared stock.',
      'Anyone with member/admin/owner role can pick. Clients are read-only in Pick Mode.',
    ],
  },

  'pick-lists': {
    id: 'pick-lists',
    title: 'Pick Lists',
    intro: 'A Pick List is a curated set of items + quantities someone needs to pull from inventory (e.g. an order, a job site delivery). It moves through three states: Draft → Ready → Completed.',
    steps: [
      { title: 'Create a draft', body: 'Click "+ New". Give it a unique name and optionally assign a member. A short code like PL-A3K9FX is auto-generated for scanning.' },
      { title: 'Add items', body: 'Search by name/SKU/location and add them with requested quantities. Items already reserved by other active lists show a warning.' },
      { title: 'Mark Ready', body: 'When the list is finalized, hit "Mark Ready". Items are now reserved and the list shows up in Pick Mode.' },
      { title: 'Pick (Pick Mode or here)', body: 'Either use Pick Mode for fast scanning, or pick directly from this detail panel using the qty input + Pick button per line.' },
      { title: 'Comment / report issues', body: 'Use the comment thread for team chat. Report issues per line if something is wrong with the stock.' },
      { title: 'Complete', body: 'Once all lines are fully picked, click "Complete". The transaction history captures every pick.' },
    ],
  },

  'purchase-orders': {
    id: 'purchase-orders',
    title: 'Purchase Orders',
    intro: 'A Purchase Order (PO) tracks stock you\'re buying from a supplier. Statuses: Draft → Ordered → Received (or Cancelled). When you Receive, ordered quantities are added to inventory atomically and audit transactions are recorded.',
    steps: [
      { title: 'Create a PO', body: 'Click "+ New" and enter the supplier name. A unique number like PO-2026-7GX6Z1 is auto-generated.' },
      { title: 'Add line items', body: 'Search inventory items and add them with ordered qty + unit cost. Total cost auto-calculates.' },
      { title: 'Mark Ordered', body: 'When you\'ve actually placed the order with the supplier, click "Mark Ordered". This locks editing.' },
      { title: 'Receive', body: 'When stock arrives, click "Receive Order". All ordered qtys are added to inventory + audit transactions are written.' },
      { title: 'Cancel if needed', body: 'Drafts and ordered POs can be cancelled. No inventory changes occur on cancel.' },
    ],
  },

  'stock-counts': {
    id: 'stock-counts',
    title: 'Stock Counts',
    intro: 'A Stock Count is a physical inventory audit. You enter what you actually counted, the system shows differences, and applying the count reconciles inventory to your counted numbers (creating audit transactions).',
    steps: [
      { title: 'Create a count', body: 'Click "+ New" and name it (e.g. "Q2 Full Count").' },
      { title: 'Add items', body: 'Use "+ Add Item" to add specific items, or "+ Add All Inventory Items" to include everything.' },
      { title: 'Start the count', body: 'Hit "Start Count" to switch to In Progress.' },
      { title: 'Enter actual quantities', body: 'For each line, type what you physically counted. The Diff column shows the gap (red = shortage, green = surplus).' },
      { title: 'Apply to Inventory', body: 'Click "Apply to Inventory". Each counted line updates inventory + creates a transaction labeled "stock_count".' },
    ],
    tips: [
      'You can leave items uncounted (blank actual) — only counted ones reconcile.',
      'Once applied, the count is locked at Completed status.',
    ],
  },

  'items': {
    id: 'items',
    title: 'Items',
    intro: 'Items are the things in your inventory: SKUs, quantities, prices, photos, dimensions, custom fields. They live inside folders for organisation and can carry tags for cross-cutting filtering.',
    steps: [
      { title: 'Add an item', body: 'From a folder view, click "+ Add Item". Set name, qty, optional SKU, location, prices, photos.' },
      { title: 'Set min level', body: 'Min level powers low-stock alerts. When qty falls at or below it, the item appears in Notifications.' },
      { title: 'Move between folders', body: 'Open the item, change "Folder" to relocate. This is logged to the activity feed.' },
      { title: 'Tag for filters', body: 'Tags are colored labels that group items across folders (e.g. "fragile", "fast-moving").' },
    ],
  },

  'folders': {
    id: 'folders',
    title: 'Folders',
    intro: 'Folders are the hierarchical organisation for inventory. Nest them as deep as you need (e.g. Warehouse → Aisle 3 → Shelf B). Each folder shows aggregate stats (items, units, value) computed live from the database.',
    steps: [
      { title: 'Create folders', body: 'Inside Items, click "+ New Folder". Set color, optional cover image, optional SKU prefix.' },
      { title: 'Nest', body: 'Create folders inside folders. Stats roll up automatically.' },
      { title: 'Client access', body: 'Owners/admins can grant client-role users access to specific folders only — they\'ll see only those + descendants.' },
    ],
  },

  'tags': {
    id: 'tags',
    title: 'Tags',
    intro: 'Tags are color-coded labels that you attach to items. Unlike folders, tags cross folder boundaries — useful for status (active/discontinued), category (fragile/perishable), supplier, etc.',
    steps: [
      { title: 'Create a tag', body: 'Tags page → "+ New Tag" with a name and color.' },
      { title: 'Apply', body: 'Open an item → Edit → select tags. An item can carry multiple tags.' },
      { title: 'Filter by tag', body: 'Use Search or Items page filters to narrow by tag.' },
    ],
  },

  'team': {
    id: 'team',
    title: 'Team',
    intro: 'Manage who has access to your inventory. Four roles: Owner (full + cannot be removed), Admin (full + manage team), Member (edit inventory), Client (read-only, scoped to specific folders).',
    steps: [
      { title: 'Generate an invite', body: 'Owners/admins click "Generate Invite Code". Share the 6-char code; the user enters it after registering to join your team.' },
      { title: 'Change roles', body: 'Use the dropdown next to each member to switch admin/member/client. Owner cannot be demoted.' },
      { title: 'Remove members', body: 'Trash icon next to a member removes them. They lose access immediately.' },
      { title: 'Client folder access', body: 'For client-role users, grant access to specific folders. Without grants, clients see nothing.' },
    ],
  },

  'reports': {
    id: 'reports',
    title: 'Reports',
    intro: 'Aggregate views of inventory health: total value, low stock, top-quantity items, folder breakdown, recent activity. Read-only — no actions.',
    steps: [
      { title: 'Total value', body: 'Sum of (quantity × sell_price) across all active items.' },
      { title: 'Low stock', body: 'Items where qty ≤ min_quantity. Restock candidates.' },
      { title: 'Activity', body: 'Recent CRUD events from the activity_log table. Filter by entity type or action.' },
    ],
  },

  'notifications': {
    id: 'notifications',
    title: 'Notifications',
    intro: 'Two streams: Low Stock Alerts (live computed from items where qty ≤ min) and Activity History (recent changes from your team). New items show a blue "new" dot until you mark all as read.',
    steps: [
      { title: 'Mark all as read', body: '"Mark all as read" button stamps the local "last seen" — earlier entries lose their new badge.' },
      { title: 'Toggle low-stock', body: 'Settings → Preferences → Low Stock Alerts to disable the entire alerts tab.' },
    ],
  },

  'workflows': {
    id: 'workflows',
    title: 'Workflows',
    intro: 'Workflows bundles three operational tools that move stock around: Pick Lists (out), Purchase Orders (in), and Stock Counts (reconciliation). Each tab has its own help button.',
    steps: [
      { title: 'Pick Lists', body: 'Curated outbound lists. See the Pick Lists help.' },
      { title: 'Purchase Orders', body: 'Inbound stock from suppliers. See the Purchase Orders help.' },
      { title: 'Stock Counts', body: 'Physical audit + reconcile. See the Stock Counts help.' },
    ],
  },

  'dashboard': {
    id: 'dashboard',
    title: 'Dashboard',
    intro: 'Your team\'s inventory at a glance: item count, folder count, total quantity, total value, plus items needing restock. Filter by selected folders to scope the numbers.',
    steps: [
      { title: 'Filter folders', body: 'Use "All Folders" / specific folder pills to scope all KPIs to a subset.' },
      { title: 'Quick view items', body: 'Click "View Items" to jump to the full list with the current folder filter applied.' },
    ],
  },

  'search': {
    id: 'search',
    title: 'Search',
    intro: 'Full-text search across item names, SKUs, locations, descriptions and folder names. Results group by entity. Click any result to jump straight to it.',
    steps: [
      { title: 'Type', body: 'Searches as you type. No need to hit enter.' },
      { title: 'Filter', body: 'Restrict to items only, folders only, or all.' },
    ],
  },

  'settings': {
    id: 'settings',
    title: 'Settings',
    intro: 'Per-team preferences: organisation name, currency symbol, default item view (grid/list), low-stock alerts toggle. Plus billing and account.',
    steps: [
      { title: 'Org name', body: 'Sets the label shown in the sidebar header and on team invites.' },
      { title: 'Currency', body: 'Prices are stored in GBP and shown converted to your selected currency using daily exchange rates.' },
      { title: 'Default view', body: 'Items page opens in grid or list; user can override per-session.' },
      { title: 'Plan / billing', body: 'Upgrade triggers a Stripe checkout. Free is capped at 100 items / 1 user.' },
    ],
  },
};

export function getTutorial(id: string): Tutorial | null {
  return TUTORIALS[id] ?? null;
}
