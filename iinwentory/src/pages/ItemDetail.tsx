import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit2,
  FileText,
  Folder,
  FolderInput,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Package,
  QrCode,
  Save,
  Sliders,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import CustomFieldsEditor from "../components/CustomFieldsEditor";
import AdjustStockModal from "../components/item-detail/AdjustStockModal";
import HistoryModal from "../components/item-detail/HistoryModal";
import TransactionsModal from "../components/item-detail/TransactionsModal";
import { apiUploadPhoto } from "../lib/api";
import {
  FIELD_TYPE_LABELS,
  parseCustomFields,
  serializeCustomFields,
  type CustomField,
} from "../lib/customFields";
import { itemInventoryValue } from "../lib/itemValue";
import { fetchActivityLog } from "../store/activityLog";
import { fetchTransactions } from "../store/transactions";
import { useAuth } from "../store/useAuthStore";
import { useCurrency } from "../store/useCurrencyStore";
import { useSettings } from "../store/useSettingsStore";
import { useStore } from "../store/useStore";
import { useTeam } from "../store/useTeamStore";
import { useWorkflows } from "../store/useWorkflowStore";
import type { ActivityLogEntry } from "../types";

function renderFieldValue(f: CustomField): React.ReactNode {
  const v = f.value;
  if (v === null || v === "" || v === undefined) {
    return <span style={{ color: "var(--text-faint)" }}>—</span>;
  }
  if (f.type === "checkbox") {
    return <span style={{ fontWeight: 600 }}>{v ? "Yes" : "No"}</span>;
  }
  if (f.type === "web_link" && typeof v === "string") {
    return (
      <a
        href={v}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--primary)", textDecoration: "underline" }}
      >
        {v}
      </a>
    );
  }
  if (f.type === "email" && typeof v === "string") {
    return (
      <a
        href={`mailto:${v}`}
        style={{ color: "var(--primary)", textDecoration: "underline" }}
      >
        {v}
      </a>
    );
  }
  if (f.type === "phone" && typeof v === "string") {
    return (
      <a
        href={`tel:${v.replace(/\s+/g, "")}`}
        style={{ color: "var(--primary)", textDecoration: "underline" }}
      >
        {v}
      </a>
    );
  }
  if (f.type === "large_text" && typeof v === "string") {
    return <span style={{ whiteSpace: "pre-wrap" }}>{v}</span>;
  }
  return <span>{String(v)}</span>;
}

function formatLogDetails(
  action: string,
  details: unknown,
  name: string,
): string {
  if (typeof details === "string") return details;
  if (!details || typeof details !== "object") return action;
  const d = details as Record<string, unknown>;
  const before = typeof d.before === "number" ? d.before : null;
  const after = typeof d.after === "number" ? d.after : null;
  const change = typeof d.change === "number" ? d.change : null;
  const reason = typeof d.reason === "string" ? d.reason : null;
  const verb = action.split(".").pop() ?? action;
  if (verb === "qty_changed" && before !== null && after !== null) {
    return `Quantity ${before} → ${after}${reason ? ` — ${reason}` : ""}`;
  }
  if (verb === "qty_changed" && change !== null) {
    return `Quantity ${change > 0 ? "+" : ""}${change}${reason ? ` — ${reason}` : ""}`;
  }
  if (verb === "created") return "Item created";
  if (verb === "deleted") return "Item deleted";
  if (verb === "moved") return "Item moved";
  if (verb === "updated") return "Item updated";
  return name || action;
}

export default function ItemDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const routeLocation = useLocation();
  const cameFrom = (routeLocation.state as { from?: string } | null)?.from;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const store = useStore();
  const wf = useWorkflows();
  const item = itemId ? store.getItemById(itemId) : undefined;
  const { settings } = useSettings();
  const { format } = useCurrency();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item?.name ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [weight, setWeight] = useState(
    item?.weight !== null && item?.weight !== undefined
      ? String(item.weight)
      : "",
  );
  const [location, setLocation] = useState(item?.location ?? "");
  const [qty, setQty] = useState(item?.quantity?.toString() ?? "1");
  const [price, setPrice] = useState(item?.price?.toString() ?? "0");
  const [costPrice, setCostPrice] = useState(
    item?.costPrice != null ? String(item.costPrice) : "",
  );
  const [sellPrice, setSellPrice] = useState(
    item?.sellPrice != null ? String(item.sellPrice) : "",
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(() =>
    item ? parseCustomFields(item.customFields) : [],
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [showAdjust, setShowAdjust] = useState(false);
  const [unit, setUnit] = useState(item?.unit ?? "units");
  const [minLevel, setMinLevel] = useState(
    item?.minLevel !== null && item?.minLevel !== undefined
      ? String(item.minLevel)
      : "",
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [showQR, setShowQR] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<ActivityLogEntry[] | null>(
    null,
  );
  const [showMove, setShowMove] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<ActivityLogEntry[]>([]);
  const { members } = useTeam();
  const { user, plan } = useAuth();
  const myRole = members.find((m) => m.id === user?.id)?.role;
  const canSeeAuthor = myRole === "owner";

  useEffect(() => {
    if (!itemId) return;
    fetchActivityLog(itemId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [itemId, item?.updatedAt]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let mutated = false;
    if (next.get("history") === "1") {
      setShowHistory(true);
      next.delete("history");
      mutated = true;
    }
    if (next.get("transactions") === "1") {
      setShowTransactions(true);
      next.delete("transactions");
      mutated = true;
    }
    if (next.get("qr") === "1") {
      setShowQR(true);
      next.delete("qr");
      mutated = true;
    }
    if (mutated) setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!showTransactions || !itemId || transactions !== null) return;
    fetchTransactions(itemId)
      .then(setTransactions)
      .catch(() => setTransactions([]));
  }, [showTransactions, itemId, transactions]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft" && item && item.photos.length > 1) {
        setLightboxIndex((i) =>
          i === null ? 0 : (i - 1 + item.photos.length) % item.photos.length,
        );
      }
      if (e.key === "ArrowRight" && item && item.photos.length > 1) {
        setLightboxIndex((i) =>
          i === null ? 0 : (i + 1) % item.photos.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, item]);

  if (!item) {
    return (
      <div className="empty-state" style={{ height: "100%" }}>
        <Package size={48} />
        <p>Item not found</p>
        <p>This item may have been deleted.</p>
        <button
          className="btn-primary"
          style={{ marginTop: "16px" }}
          onClick={() => navigate(cameFrom || "/items")}
        >
          <ArrowLeft size={15} /> Back to Items
        </button>
      </div>
    );
  }

  const breadcrumbs = store.getFolderPath(item.parentId);
  const itemTags = store.tags.filter((t) => item.tags.includes(t.id));
  // Total Value uses the shared inventory-value rule (sell price preferred,
  // falling back to cost) so the item page matches the Items list and the
  // Dashboard total. Previously this used cost_price only, which made the
  // item page disagree with every other "Total Value" in the app.
  const totalValue = itemInventoryValue(item);
  const reserved = wf.reservations[item.id] ?? 0;
  const available = Math.max(0, item.quantity - reserved);
  // Encode just the SKU (or the item ID as fallback) so a barcode scanner
  // reads a plain string — not a JSON blob. Matches the mobile app's contract.
  const qrData = (item.sku && item.sku.trim()) || item.id;

  const startEdit = () => {
    setName(item.name);
    setSku(item.sku ?? "");
    setWeight(item.weight !== null ? String(item.weight) : "");
    setLocation(item.location ?? "");
    setQty(item.quantity.toString());
    setPrice(item.price.toString());
    setCostPrice(item.costPrice != null ? String(item.costPrice) : "");
    setSellPrice(item.sellPrice != null ? String(item.sellPrice) : "");
    setCustomFields(parseCustomFields(item.customFields));
    setUnit(item.unit);
    setMinLevel(item.minLevel !== null ? item.minLevel.toString() : "");
    setNotes(item.notes);
    setDescription(item.description ?? "");
    setEditing(true);
  };

  const handleSave = () => {
    const weightNum = weight ? parseFloat(weight) : null;
    const cost = costPrice.trim() === "" ? null : parseFloat(costPrice) || 0;
    const sell = sellPrice.trim() === "" ? null : parseFloat(sellPrice) || 0;
    void store.updateItem(item.id, {
      name: name.trim() || item.name,
      sku: sku.trim() || null,
      weight: weightNum !== null && !Number.isNaN(weightNum) ? weightNum : null,
      location: location.trim() || null,
      quantity: parseInt(qty) || item.quantity,
      // Sell price drives the legacy `price` field for backward compat.
      price: sell ?? (parseFloat(price) || 0),
      sellPrice: sell,
      costPrice: cost,
      unit,
      minLevel: minLevel ? parseInt(minLevel) : null,
      notes,
      description: description.trim() || null,
      // Merge user-edited custom fields back with the existing raw blob so
      // server-managed keys (`unit`) survive. Server also re-injects unit.
      customFields: serializeCustomFields(
        customFields,
        (item.customFields ?? null) as Record<string, unknown> | null,
      ),
    });
    setEditing(false);
  };

  const executeDelete = () => {
    void store.deleteItem(item.id);
    navigate("/items");
  };

  const handleDuplicate = async () => {
    const created = await store.addItem({
      name: `${item.name} (copy)`,
      parentId: item.parentId,
      sku: item.sku ?? null,
      weight: item.weight ?? null,
      location: item.location ?? null,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit,
      minLevel: item.minLevel ?? null,
      notes: item.notes,
      tags: [...item.tags],
      photos: [...item.photos],
    });
    if (created) navigate(`/items/detail/${created.id}`);
  };

  const handleMove = (folderId: string | null) => {
    void store.updateItem(item.id, { parentId: folderId });
    setShowMove(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const res = await apiUploadPhoto(file);
        urls.push(res.url);
      }
      await store.updateItem(item.id, { photos: [...item.photos, ...urls] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (url: string) => {
    setPhotoToRemove(url);
  };

  const confirmRemovePhoto = () => {
    if (!photoToRemove) return;
    void store.updateItem(item.id, {
      photos: item.photos.filter((p) => p !== photoToRemove),
    });
    setPhotoToRemove(null);
  };

  const downloadQR = () => {
    const svg = document.getElementById("item-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx?.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement("a");
      a.download = `${item.name}-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const stockState =
    item.quantity === 0
      ? "out"
      : item.minLevel !== null && item.quantity <= item.minLevel
        ? "low"
        : "in";
  const chipClass =
    stockState === "out"
      ? "chip-danger"
      : stockState === "low"
        ? "chip-warning"
        : "chip-success";
  const stockLabel =
    stockState === "out"
      ? "Out of stock"
      : stockState === "low"
        ? "Low stock"
        : "In stock";

  return (
    <div style={{ padding: "28px 36px 32px", flex: 1, overflowY: "auto" }}>
      {/* Breadcrumbs */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/items" className="breadcrumb-link">
          <Folder size={13} strokeWidth={1.9} /> All Items
        </Link>
        {breadcrumbs.map((bc) => (
          <span
            key={bc.id}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <ChevronRight size={13} color="var(--text-faint)" />
            <Link to={`/items/folder/${bc.id}`} className="breadcrumb-link">
              {bc.name}
            </Link>
          </span>
        ))}
        <ChevronRight size={13} color="var(--text-faint)" />
        <span className="breadcrumb-link current">{item.name}</span>
      </nav>

      {/* Header */}
      <div className="page-hero" style={{ alignItems: "flex-start" }}>
        <div className="page-hero-text">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              className="icon-btn"
              onClick={() => cameFrom ? navigate(cameFrom) : navigate(-1)}
              title="Back"
              style={{ marginLeft: -8 }}
            >
              <ArrowLeft size={16} strokeWidth={2.1} />
            </button>
            <span className="page-eyebrow" style={{ marginBottom: 0 }}>
              <Package size={12} strokeWidth={2.4} /> Item
            </span>
            <span className={`chip ${chipClass}`}>{stockLabel}</span>
          </div>
          {editing ? (
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                fontSize: "28px",
                fontWeight: 800,
                padding: "6px 10px",
                letterSpacing: "-0.025em",
                maxWidth: 520,
              }}
              autoFocus
            />
          ) : (
            <h1 style={{ marginBottom: 6 }}>{item.name}</h1>
          )}
          <p
            className="page-hero-sub"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                letterSpacing: "0.02em",
              }}
            >
              ID · {item.id.slice(0, 12)}…
            </span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ color: "var(--text-muted)" }}>
              Updated {new Date(item.updatedAt).toLocaleString()}
            </span>
          </p>
        </div>
        <div className="page-hero-actions">
          {editing ? (
            <>
              <button className="btn-outline" onClick={() => setEditing(false)}>
                <X size={15} /> Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                <Save size={15} /> Save
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-outline"
                onClick={() => setShowHistory(true)}
                title="Activity history"
                aria-label="Activity history"
                style={{ padding: "8px" }}
              >
                <BarChart3 size={16} />
              </button>
              <button
                className="btn-outline"
                onClick={() => setShowMove(true)}
                title="Move to folder"
                aria-label="Move to folder"
                style={{ padding: "8px" }}
              >
                <FolderInput size={16} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="btn-outline"
                    title="More actions"
                    aria-label="More actions"
                    style={{ padding: "8px" }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onSelect={() => setShowQR(true)}>
                    <QrCode size={14} /> View QR code
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void handleDuplicate()}>
                    <Copy size={14} /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmDeleteItem(true)}
                  >
                    <Trash2 size={14} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button className="btn-primary" onClick={startEdit}>
                <Edit2 size={15} /> EDIT
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {/* Quantity */}
        <div
          className="stat-card"
          style={
            { ["--stat-accent" as string]: "#294EA7" } as React.CSSProperties
          }
        >
          <span
            className="stat-card-icon"
            style={{
              background: "rgba(41, 78, 167, 0.10)",
              color: "#294EA7",
              boxShadow: "inset 0 0 0 1px rgba(41, 78, 167, 0.22)",
            }}
          >
            <Package size={17} strokeWidth={2.0} />
          </span>
          {editing ? (
            <input
              className="input"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{
                fontSize: "24px",
                fontWeight: 800,
                padding: "4px 8px",
                letterSpacing: "-0.022em",
              }}
            />
          ) : (
            <span className="stat-card-value">{item.quantity}</span>
          )}
          <div className="stat-card-label">
            Quantity ·{" "}
            {editing ? (
              <input
                className="input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  display: "inline",
                  width: "70px",
                  padding: "1px 6px",
                  fontSize: "11px",
                }}
              />
            ) : (
              item.unit
            )}
          </div>
          {reserved > 0 && !editing && (
            <div
              style={{
                marginTop: 8,
                fontSize: "11px",
                color: "#B45309",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(245, 158, 11, 0.14)",
              }}
            >
              {reserved} reserved · <b>{available}</b> available
            </div>
          )}
          {!editing && (
            <button
              type="button"
              onClick={() => setShowAdjust(true)}
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "var(--primary)",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.005em",
                cursor: "pointer",
                boxShadow:
                  "0 4px 10px -6px var(--primary-glow, rgba(41,78,167,0.5))",
                transition:
                  "transform .12s var(--ease), box-shadow .15s var(--ease)",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.97)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              <Sliders size={12} strokeWidth={2.4} /> Adjust
            </button>
          )}
        </div>

        {/* Min level */}
        <div
          className="stat-card"
          style={
            { ["--stat-accent" as string]: "#7C3AED" } as React.CSSProperties
          }
        >
          <span
            className="stat-card-icon"
            style={{
              background: "rgba(124, 58, 237, 0.10)",
              color: "#7C3AED",
              boxShadow: "inset 0 0 0 1px rgba(124, 58, 237, 0.22)",
            }}
          >
            <BarChart3 size={17} strokeWidth={2.0} />
          </span>
          {editing ? (
            <input
              className="input"
              type="number"
              placeholder="—"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value)}
              style={{
                fontSize: "24px",
                fontWeight: 800,
                padding: "4px 8px",
                letterSpacing: "-0.022em",
              }}
            />
          ) : (
            <span className="stat-card-value">{item.minLevel ?? "—"}</span>
          )}
          <div className="stat-card-label">Min level · {item.unit}</div>
        </div>

        {/* Cost + Sell prices — separated to match the mobile app */}
        <div
          className="stat-card"
          style={
            { ["--stat-accent" as string]: "#10B981" } as React.CSSProperties
          }
        >
          <span
            className="stat-card-icon"
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              color: "#047857",
              boxShadow: "inset 0 0 0 1px rgba(16, 185, 129, 0.24)",
            }}
          >
            <FileText size={17} strokeWidth={2.0} />
          </span>
          {editing ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                    minWidth: 32,
                  }}
                >
                  Cost
                </span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  style={{ fontSize: 15, fontWeight: 700, padding: "4px 8px" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                    minWidth: 32,
                  }}
                >
                  Sell
                </span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  style={{ fontSize: 15, fontWeight: 700, padding: "4px 8px" }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: "100%",
              }}
            >
              <span className="stat-card-value" style={{ fontSize: 20 }}>
                {item.costPrice != null ? (
                  format(item.costPrice)
                ) : (
                  <span style={{ color: "var(--text-faint)" }}>—</span>
                )}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Sell:{" "}
                <b style={{ color: "var(--text-medium)" }}>
                  {item.sellPrice != null ? format(item.sellPrice) : "—"}
                </b>
              </span>
            </div>
          )}
          <div className="stat-card-label">Cost price · per {item.unit}</div>
        </div>

        {/* Total */}
        <div
          className="stat-card"
          style={
            {
              ["--stat-accent" as string]: "#D4A042",
              background:
                "linear-gradient(160deg, var(--card-bg) 0%, color-mix(in srgb, var(--primary) 4%, var(--card-bg)) 100%)",
            } as React.CSSProperties
          }
        >
          <span
            className="stat-card-icon"
            style={{
              background: "rgba(212, 160, 66, 0.14)",
              color: "#92400E",
              boxShadow: "inset 0 0 0 1px rgba(212, 160, 66, 0.30)",
            }}
          >
            <Package size={17} strokeWidth={2.0} />
          </span>
          <span className="stat-card-value" style={{ color: "var(--primary)" }}>
            {format(totalValue)}
          </span>
          <div className="stat-card-label">Total value</div>
        </div>
      </div>

      {/* Product Information + Custom Fields */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div className="card" style={{ padding: "22px", cursor: "default" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FileText size={16} color="var(--primary)" /> Product Information
            </h3>
            <button
              className="btn-outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ fontSize: "12px", padding: "6px 10px" }}
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload size={13} /> Upload photo
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
              style={{ display: "none" }}
            />
          </div>

          {uploadError && (
            <div
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              {uploadError}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "6px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ImageIcon size={12} /> Photos ({item.photos.length})
            </div>
            {item.photos.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  background: "var(--surface-raised)",
                  border: "1px dashed var(--border-color)",
                  borderRadius: "10px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Max 8 photos, 30 MB total (JPG, PNG, HEIC).
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: "10px",
                }}
              >
                {item.photos.map((url, idx) => (
                  <div
                    key={url}
                    onClick={() => setLightboxIndex(idx)}
                    style={{
                      position: "relative",
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border-color)",
                      cursor: "zoom-in",
                    }}
                  >
                    <img
                      src={url}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(url);
                      }}
                      title="Remove"
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        padding: "4px",
                        borderRadius: "6px",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description — separate from Notes per the mobile app */}
          {editing ? (
            <div style={{ marginBottom: "14px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  marginBottom: "4px",
                }}
              >
                Description
              </div>
              <textarea
                className="input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description…"
                style={{ resize: "vertical" }}
              />
            </div>
          ) : item.description ? (
            <div
              style={{
                marginBottom: "14px",
                padding: "10px 12px",
                background: "var(--surface-raised)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "var(--text-medium)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              {item.description}
            </div>
          ) : null}

          {editing && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    marginBottom: "4px",
                  }}
                >
                  SKU / Product number
                </div>
                <input
                  className="input"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. CHR-001"
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    marginBottom: "4px",
                  }}
                >
                  Weight (kg)
                </div>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    marginBottom: "4px",
                  }}
                >
                  Location
                </div>
                <input
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Aisle 3, Shelf B"
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: "14px" }}>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "4px",
                fontWeight: 500,
              }}
            >
              Tags
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {itemTags.length > 0 ? (
                itemTags.map((t) => (
                  <span
                    key={t.id}
                    className="badge-tag"
                    style={{ background: t.color + "20", color: t.color }}
                  >
                    {t.name}
                  </span>
                ))
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  —
                </span>
              )}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "4px",
                fontWeight: 500,
              }}
            >
              Notes
            </div>
            {editing ? (
              <textarea
                className="input"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ resize: "vertical" }}
              />
            ) : (
              <p
                style={{
                  fontSize: "13px",
                  color: item.notes ? "var(--text-dark)" : "var(--text-muted)",
                  lineHeight: "1.6",
                }}
              >
                {item.notes || "—"}
              </p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: "22px", cursor: "default" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Custom Fields</h3>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-faint)",
                fontWeight: 600,
              }}
            >
              {customFields.length} /{" "}
              {plan.customFields === Infinity ? "∞" : plan.customFields}
            </span>
          </div>
          {editing ? (
            <CustomFieldsEditor
              fields={customFields}
              onChange={setCustomFields}
              max={
                plan.customFields === Infinity ? undefined : plan.customFields
              }
            />
          ) : customFields.length === 0 ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                lineHeight: "1.5",
              }}
            >
              No custom fields yet. Click Edit on this item to add fields like
              serial number, supplier, warranty date, etc.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {customFields.map((f) => (
                <div
                  key={f.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 12,
                    alignItems: "baseline",
                    padding: "10px 12px",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "var(--text-dark)",
                      }}
                    >
                      {f.key}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-faint)",
                        textTransform: "uppercase",
                        letterSpacing: 0.06,
                        marginTop: 2,
                      }}
                    >
                      {FIELD_TYPE_LABELS[f.type]}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-medium)",
                      wordBreak: "break-word",
                      minWidth: 0,
                    }}
                  >
                    {renderFieldValue(f)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR & Barcode */}
      <div
        className="card"
        style={{ padding: "22px", cursor: "default", marginBottom: "20px" }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 700,
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <QrCode size={16} color="var(--primary)" /> QR & Barcode
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginBottom: "16px",
            lineHeight: "1.5",
          }}
        >
          You can use QR codes or barcodes to track the inventory of your
          products or assets.
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "16px",
              display: "inline-block",
            }}
          >
            <QRCodeSVG
              id="item-qr-code-small"
              value={qrData}
              size={100}
              level="M"
              fgColor="#294EA7"
            />
          </div>
          <div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "4px",
              }}
            >
              ID: <b>{item.id}</b>
            </p>
            {item.sku && (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginBottom: "8px",
                }}
              >
                SKU: <b style={{ fontFamily: "monospace" }}>{item.sku}</b>
              </p>
            )}
            <button
              className="btn-outline"
              onClick={() => setShowQR(true)}
              style={{ fontSize: "12px" }}
            >
              <QrCode size={13} /> View Full QR
            </button>
          </div>
        </div>
      </div>

      {/* Inline Item History — matches the mobile app's Item Detail layout */}
      <div
        className="card"
        style={{ padding: "22px", cursor: "default", marginBottom: "20px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: 0,
            }}
          >
            <Clock size={16} color="var(--primary)" /> Item History
          </h3>
          {history.length > 5 && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowHistory(true)}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              View All History ({history.length})
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p
            style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}
          >
            No changes yet. Edits and stock adjustments will show up here.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {history.slice(0, 5).map((h) => {
              const memberName = h.userId
                ? (members.find((m) => m.id === h.userId)?.name ?? "Member")
                : "System";
              return (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "var(--surface-raised)",
                    fontSize: "13px",
                  }}
                >
                  <span>
                    {formatLogDetails(h.action, h.details, h.entityName)}
                    {canSeeAuthor && (
                      <span
                        style={{ color: "var(--text-muted)", marginLeft: 6 }}
                      >
                        · by{" "}
                        <b style={{ color: "var(--text-medium)" }}>
                          {memberName}
                        </b>
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                      marginLeft: "12px",
                    }}
                  >
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adjust Stock modal */}
      <AdjustStockModal
        open={showAdjust}
        onClose={() => setShowAdjust(false)}
        item={item}
      />
      <HistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        members={members}
        canSeeAuthor={canSeeAuthor}
        formatEntry={formatLogDetails}
      />
      <TransactionsModal
        open={showTransactions}
        onClose={() => setShowTransactions(false)}
        transactions={transactions}
      />

      <AlertDialog open={confirmDeleteItem} onOpenChange={setConfirmDeleteItem}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The item and its history will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={executeDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!photoToRemove}
        onOpenChange={(o) => {
          if (!o) setPhotoToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              The photo will be removed from this item. The original file is not
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmRemovePhoto}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showMove && (
        <div className="modal-overlay" onClick={() => setShowMove(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "100%" }}
          >
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FolderInput size={18} /> Move to folder
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              Currently in:{" "}
              <b style={{ color: "var(--text-dark)" }}>
                {item.parentId
                  ? (store.getFolderById(item.parentId)?.name ?? "Unknown")
                  : "All Items (root)"}
              </b>
            </p>
            <div
              style={{
                marginTop: "12px",
                maxHeight: "50vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <button
                onClick={() => handleMove(null)}
                disabled={item.parentId === null}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-color)",
                  cursor: item.parentId === null ? "not-allowed" : "pointer",
                  opacity: item.parentId === null ? 0.5 : 1,
                  fontSize: "13px",
                  textAlign: "left",
                }}
              >
                <Folder size={14} /> All Items (root)
              </button>
              {store.folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleMove(f.id)}
                  disabled={f.id === item.parentId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border-color)",
                    cursor: f.id === item.parentId ? "not-allowed" : "pointer",
                    opacity: f.id === item.parentId ? 0.5 : 1,
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                >
                  <Folder size={14} color={f.color} /> {f.name}
                  {f.id === item.parentId && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      current
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: "16px" }}>
              <button
                className="btn-outline"
                onClick={() => setShowMove(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: "center" }}
          >
            <h2>QR Code — {item.name}</h2>
            <div
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-color)",
                borderRadius: "16px",
                padding: "32px",
                margin: "0 auto 16px",
                display: "inline-block",
              }}
            >
              <QRCodeSVG
                id="item-qr-code"
                value={qrData}
                size={220}
                level="H"
                fgColor="#294EA7"
                includeMargin
              />
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              Scan to access <b>{item.name}</b>.
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            >
              {item.sku && <>SKU {item.sku} · </>}
              {item.quantity} {item.unit} · {format(item.price)}/unit
            </p>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button className="btn-outline" onClick={downloadQR}>
                <Download size={15} /> Download PNG
              </button>
              <button className="btn-primary" onClick={() => setShowQR(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && item.photos[lightboxIndex] && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "zoom-out",
            padding: "24px",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "20px",
              right: "24px",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              padding: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
          {item.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + item.photos.length) %
                      item.photos.length,
                  );
                }}
                aria-label="Previous"
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ArrowLeft size={22} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % item.photos.length);
                }}
                aria-label="Next"
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ArrowLeft size={22} style={{ transform: "rotate(180deg)" }} />
              </button>
            </>
          )}
          <img
            src={item.photos[lightboxIndex]}
            alt={item.name}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "88vh",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              cursor: "default",
            }}
          />
          {item.photos.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.75)",
                fontSize: "13px",
                fontWeight: 500,
                background: "rgba(0,0,0,0.5)",
                padding: "6px 14px",
                borderRadius: "999px",
              }}
            >
              {lightboxIndex + 1} / {item.photos.length}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin-kf { to { transform: rotate(360deg); } }
        .spin { animation: spin-kf 1s linear infinite; }
      `}</style>
    </div>
  );
}
