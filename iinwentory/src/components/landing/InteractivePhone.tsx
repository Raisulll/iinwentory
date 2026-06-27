import { useMemo, useRef, useState } from 'react';
import {
  Home, Search, ChevronRight, TrendingUp, Package, AlertTriangle, Bell,
  Settings, User, FileText, BarChart3, Tags, Sun, X, Plus, Minus,
  FolderOpen, QrCode, ClipboardList, Layers, Menu as MenuIcon, Users,
  Grid3x3, SlidersHorizontal, LayoutGrid, MoreHorizontal, CheckSquare,
  Trophy, Hexagon, type LucideIcon,
} from 'lucide-react';

type Screen = 'home' | 'inventory' | 'functions' | 'menu';
type ThemeMode = 'light' | 'dark';

interface Item { id: string; name: string; qty: number; value: number; emoji: string; folder?: string }
interface Folder { name: string; folders: number; units: number; value: number; img: string }

const initFolders: Folder[] = [
  { name: 'Haseeb', folders: 0, units: 10, value: 0, img: '📦' },
  { name: 'Jamal Bukhari', folders: 0, units: 10, value: 10, img: '📋' },
];

const periods = ['7 Days', '14 Days', '1 Month', 'Custom'];
const rc = ['#22C55E', '#94A3B8', '#F97316'];

const fns: { icon: LucideIcon; title: string; desc: string; active: boolean; soon: boolean }[] = [
  { icon: ClipboardList, title: 'Pick Lists', desc: 'Pick items from inventory for orders and fulfillment', active: true, soon: false },
  { icon: CheckSquare, title: 'Stock Counts', desc: 'Verify inventory accuracy with physical counts', active: false, soon: true },
  { icon: FileText, title: 'Purchase Orders', desc: 'Track orders from suppliers and receive items', active: false, soon: true },
];

const toolItems: { icon: LucideIcon; title: string; sub?: string }[] = [
  { icon: BarChart3, title: 'Reports', sub: 'Summary, activity' },
  { icon: QrCode, title: 'Picking Mode' },
  { icon: Tags, title: 'Tags Management' },
  { icon: Users, title: 'Manage Team' },
  { icon: Bell, title: 'Notifications' },
];

export default function InteractivePhone({ theme }: { theme: ThemeMode }) {
  const dark = theme === 'dark';

  const c = useMemo(
    () =>
      dark
        ? { bg: '#1A1A2E', card: '#232340', sub: '#1E1E35', t1: '#E4E4EC', t2: '#7E7E98', t3: '#50506A', blue: '#4A7BF7', tabBg: '#141428', tabOff: '#484868', div: 'rgba(255,255,255,0.05)' }
        : { bg: '#F5F0EA', card: '#FFFFFF', sub: '#EDE8E1', t1: '#1A1A2E', t2: '#8C8C8C', t3: '#B5B5B5', blue: '#4A7BF7', tabBg: '#FDFBF7', tabOff: '#BFBFBF', div: 'rgba(0,0,0,0.05)' },
    [dark]
  );

  const [screen, setScreen] = useState<Screen>('home');
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: 'Fire 2', qty: 5, value: 2.0, emoji: '🔥', folder: 'Haseeb' },
    { id: '2', name: 'Shrey items test', qty: 3, value: 1.5, emoji: '📦', folder: 'Haseeb' },
    { id: '3', name: 'Fire', qty: 2, value: 3.0, emoji: '🔥', folder: 'Jamal Bukhari' },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newPrice, setNewPrice] = useState('9.99');
  const [toast, setToast] = useState<string | null>(null);
  const [period, setPeriod] = useState('7 Days');
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalVal = items.reduce((s, i) => s + i.qty * i.value, 0);
  const lowStock = items.filter((i) => i.qty < 3).length;
  const sellers = [...items].sort((a, b) => b.qty - a.qty).slice(0, 3);

  function notify(m: string) {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  function addItem() {
    if (!newName.trim()) return;
    const name = newName.trim();
    setItems((prev) => [
      { id: Date.now().toString(), name, qty: parseInt(newQty) || 1, value: parseFloat(newPrice) || 9.99, emoji: '📦' },
      ...prev,
    ]);
    setNewName('');
    setNewQty('1');
    setNewPrice('9.99');
    setShowAdd(false);
    notify(`Added "${name}"`);
  }

  function adj(id: string, d: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i)));
  }

  const folderItems = (name: string) => items.filter((i) => i.folder === name);
  const folderQty = (f: Folder) => folderItems(f.name).reduce((s, i) => s + i.qty, 0) || f.units;
  const folderVal = (f: Folder) => folderItems(f.name).reduce((s, i) => s + i.qty * i.value, 0) || f.value;

  return (
    <div className="relative select-none" style={{ width: '272px' }}>
      {/* Bezel */}
      <div
        className="rounded-[42px] p-[4px]"
        style={{
          background: dark ? '#0C0C18' : '#1A1A2E',
          boxShadow: '0 20px 60px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        <div className="rounded-[38px] overflow-hidden relative" style={{ height: '588px', background: c.bg }}>
          {/* Dynamic island */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[86px] h-[22px] rounded-b-[12px] z-30"
            style={{ background: dark ? '#0C0C18' : '#1A1A2E' }}
          />

          {/* Status bar */}
          <div className="absolute top-0.5 left-0 right-0 z-20 px-5 h-[22px] flex items-center justify-between">
            <span style={{ fontSize: '9px', fontWeight: 600, color: c.t1 }}>6:17</span>
            <div className="flex items-center gap-[3px] opacity-50">
              <svg width="12" height="8" viewBox="0 0 12 8"><path d="M0 6h2v2H0zM3 4h2v4H3zM6 2h2v6H6zM9 0h2v8H9z" fill={c.t1} /></svg>
              <svg width="12" height="9" viewBox="0 0 12 9"><path d="M6 0c2.8 0 5.2 1.5 6 3.8-.8 2.3-3.2 3.8-6 3.8S.8 6.1 0 3.8C.8 1.5 3.2 0 6 0z" fill="none" stroke={c.t1} strokeWidth="1" /></svg>
              <svg width="18" height="9" viewBox="0 0 18 9">
                <rect x="0" y="0" width="15" height="9" rx="2" fill="none" stroke={c.t1} strokeWidth="1" />
                <rect x="1.5" y="1.5" width="10" height="6" rx="1" fill={c.t1} />
                <rect x="16" y="2.5" width="2" height="4" rx="1" fill={c.t1} opacity="0.4" />
              </svg>
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div
              className="absolute top-6 left-3 right-3 z-50 text-white py-2 px-3 rounded-xl text-center"
              style={{ fontSize: '10px', fontWeight: 500, background: '#1A1A2E' }}
            >
              {toast}
            </div>
          )}

          {/* Screen area */}
          <div className="pt-[26px] pb-[60px] h-full overflow-y-auto overflow-x-hidden screen-scroll">
            {/* HOME */}
            {screen === 'home' && (
              <div className="px-3.5 pb-4">
                <div className="mb-4 mt-0.5">
                  <p style={{ fontSize: '10px', color: c.t2 }}>Good evening,</p>
                  <p style={{ fontSize: '21px', fontWeight: 700, color: c.t1, lineHeight: 1.15, letterSpacing: '-0.3px' }}>Ditesh</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mb-5">
                  <button type="button" className="flex flex-col items-center justify-center gap-1 rounded-xl text-white" style={{ background: c.blue, width: '68px', height: '56px' }} onClick={() => setShowAdd(true)}>
                    <Plus style={{ width: '17px', height: '17px' }} />
                    <span style={{ fontSize: '8.5px', fontWeight: 500 }}>Add Item</span>
                  </button>
                  <button type="button" className="flex flex-col items-center justify-center gap-1 rounded-xl flex-1" style={{ background: c.card, height: '56px' }} onClick={() => setScreen('inventory')}>
                    <QrCode style={{ width: '17px', height: '17px', color: c.t1 }} />
                    <span style={{ fontSize: '8.5px', fontWeight: 500, color: c.t1 }}>Scan</span>
                  </button>
                  <button type="button" className="flex flex-col items-center justify-center gap-1 rounded-xl flex-1" style={{ background: c.card, height: '56px' }} onClick={() => setScreen('functions')}>
                    <ClipboardList style={{ width: '17px', height: '17px', color: c.t1 }} />
                    <span style={{ fontSize: '8.5px', fontWeight: 500, color: c.t1 }}>Pick List</span>
                  </button>
                </div>

                {/* Overview */}
                <p style={{ fontSize: '13px', fontWeight: 600, color: c.t1, marginBottom: '8px' }}>Overview</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  <div className="rounded-xl p-2.5" style={{ background: c.card }}>
                    <div className="flex items-center justify-center rounded-lg mb-2" style={{ width: '24px', height: '24px', background: '#DBEAFE' }}>
                      <Package style={{ width: '13px', height: '13px', color: c.blue }} />
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }}>{totalQty}</p>
                    <p style={{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }}>Total Items</p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: c.card }}>
                    <div className="flex items-center justify-center rounded-lg mb-2" style={{ width: '24px', height: '24px', background: '#D1FAE5' }}>
                      <TrendingUp style={{ width: '13px', height: '13px', color: '#22C55E' }} />
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }}>£{Math.round(totalVal)}</p>
                    <p style={{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }}>Total Value</p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: c.card }}>
                    <div className="flex items-center justify-center rounded-lg mb-2" style={{ width: '24px', height: '24px', background: '#FEF3C7' }}>
                      <AlertTriangle style={{ width: '13px', height: '13px', color: '#F59E0B' }} />
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }}>{lowStock}</p>
                    <p style={{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }}>Low Stock</p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: c.card }}>
                    <div className="flex items-center justify-center rounded-lg mb-2" style={{ width: '24px', height: '24px', background: '#DBEAFE' }}>
                      <ClipboardList style={{ width: '13px', height: '13px', color: c.blue }} />
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }}>0</p>
                    <p style={{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }}>Active Picks</p>
                  </div>
                </div>

                {/* Top Sellers */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Trophy style={{ width: '13px', height: '13px', color: c.t1 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: c.t1 }}>Top Sellers</span>
                </div>
                <div className="flex gap-1 mb-3">
                  {periods.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="rounded-full"
                      style={{
                        padding: '3px 9px',
                        fontSize: '8px',
                        fontWeight: period === p ? 500 : 400,
                        background: period === p ? c.blue : 'transparent',
                        color: period === p ? '#fff' : c.t3,
                        border: period === p ? 'none' : `1px solid ${c.div}`,
                      }}
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div>
                  {sellers.map((it, i) => (
                    <div key={it.id} className="flex items-center py-[7px]" style={{ borderBottom: i < sellers.length - 1 ? `0.5px solid ${c.div}` : 'none' }}>
                      <div className="flex items-center justify-center rounded-full mr-2.5" style={{ width: '22px', height: '22px', background: `${rc[i]}18`, color: rc[i] }}>
                        <span style={{ fontSize: '9px', fontWeight: 600 }}>{i + 1}</span>
                      </div>
                      <span className="flex-1 truncate" style={{ fontSize: '11px', fontWeight: 500, color: c.t1 }}>{it.name}</span>
                      <span style={{ fontSize: '10px', color: c.t2 }}>{it.qty} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INVENTORY */}
            {screen === 'inventory' && (
              <div className="px-3.5 pb-4">
                <div className="flex items-center justify-between mb-3 mt-0.5">
                  <p style={{ fontSize: '21px', fontWeight: 700, color: c.t1, letterSpacing: '-0.3px' }}>Inventory</p>
                  <div className="flex items-center gap-2.5">
                    <Search style={{ width: '16px', height: '16px', color: c.t2 }} />
                    <SlidersHorizontal style={{ width: '16px', height: '16px', color: c.t2 }} />
                    <LayoutGrid style={{ width: '16px', height: '16px', color: c.t2 }} />
                  </div>
                </div>

                {/* Stats ribbon */}
                <div className="rounded-xl flex items-center mb-3" style={{ background: c.sub, padding: '8px 4px' }}>
                  <div className="flex-1 text-center">
                    <p style={{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }}>FOLDERS</p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: c.t1, marginTop: '1px' }}>2</p>
                  </div>
                  <div className="flex-1 text-center" style={{ borderLeft: `0.5px solid ${c.div}` }}>
                    <p style={{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }}>ITEMS</p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: c.t1, marginTop: '1px' }}>{items.length}</p>
                  </div>
                  <div className="flex-1 text-center" style={{ borderLeft: `0.5px solid ${c.div}` }}>
                    <p style={{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }}>TOTAL QTY</p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: c.t1, marginTop: '1px' }}>{totalQty}</p>
                  </div>
                  <div className="flex-1 text-center" style={{ borderLeft: `0.5px solid ${c.div}` }}>
                    <p style={{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }}>TOTAL VALUE</p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: c.blue, marginTop: '1px' }}>£{totalVal.toFixed(2)}</p>
                  </div>
                </div>

                {/* Folders */}
                <div className="space-y-2">
                  {initFolders.map((f) => (
                    <div key={f.name}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 rounded-xl p-2.5 text-left"
                        style={{ background: c.card }}
                        onClick={() => setExpandedFolder((cur) => (cur === f.name ? null : f.name))}
                      >
                        <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: '40px', height: '40px', background: c.sub, fontSize: '16px' }}>{f.img}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-[1px]">
                            <FolderOpen style={{ width: '9px', height: '9px', color: c.blue }} />
                            <span style={{ fontSize: '7.5px', fontWeight: 600, color: c.blue, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Folder</span>
                          </div>
                          <p className="truncate" style={{ fontSize: '12px', fontWeight: 600, color: c.t1, lineHeight: 1.2 }}>{f.name}</p>
                          <p style={{ fontSize: '9px', color: c.t2, marginTop: '1px' }}>
                            {f.folders} folders · {folderQty(f)} units · £{folderVal(f).toFixed(2)}
                          </p>
                        </div>
                        <MoreHorizontal style={{ width: '14px', height: '14px', color: c.t3, flexShrink: 0 }} />
                      </button>
                      {expandedFolder === f.name && folderItems(f.name).length > 0 && (
                        <div className="overflow-hidden">
                          <div className="pl-3 pr-1.5 pt-1 space-y-1">
                            {folderItems(f.name).map((it) => (
                              <div key={it.id} className="flex items-center gap-1.5 py-1 px-2 rounded-lg" style={{ background: c.sub }}>
                                <span className="truncate flex-1" style={{ fontSize: '10px', fontWeight: 500, color: c.t1 }}>{it.emoji} {it.name}</span>
                                <div className="flex items-center gap-0.5">
                                  <button type="button" className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#FEE2E2' }} onClick={(e) => { e.stopPropagation(); adj(it.id, -1); }}>
                                    <Minus style={{ width: '10px', height: '10px', color: '#ef4444' }} />
                                  </button>
                                  <span className="w-4 text-center" style={{ fontSize: '10px', fontWeight: 600, color: c.t1 }}>{it.qty}</span>
                                  <button type="button" className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#D1FAE5' }} onClick={(e) => { e.stopPropagation(); adj(it.id, 1); }}>
                                    <Plus style={{ width: '10px', height: '10px', color: '#059669' }} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* FAB */}
                <div className="flex justify-end mt-5">
                  <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: c.blue, boxShadow: `0 3px 12px ${c.blue}50` }} onClick={() => setShowAdd(true)}>
                    <Plus style={{ width: '20px', height: '20px' }} />
                  </button>
                </div>
              </div>
            )}

            {/* FUNCTIONS */}
            {screen === 'functions' && (
              <div className="px-3.5 pb-4">
                <div className="mb-4 mt-0.5">
                  <p style={{ fontSize: '21px', fontWeight: 700, color: c.t1, letterSpacing: '-0.3px' }}>Functions</p>
                  <p style={{ fontSize: '10px', color: c.t2, marginTop: '1px' }}>Manage your inventory operations</p>
                </div>
                <div className="space-y-2">
                  {fns.map((fn) => {
                    const Icon = fn.icon;
                    return (
                      <button key={fn.title} type="button" className="w-full flex items-center gap-2.5 rounded-xl p-3 text-left" style={{ background: c.card }}>
                        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: '36px', height: '36px', background: fn.active ? '#DBEAFE' : c.sub }}>
                          <Icon style={{ width: '16px', height: '16px', color: fn.active ? c.blue : c.t3 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p style={{ fontSize: '12px', fontWeight: 600, color: fn.active ? c.t1 : c.t2 }}>{fn.title}</p>
                            {fn.soon && (
                              <span className="rounded px-1 py-[1px]" style={{ fontSize: '7px', fontWeight: 600, color: c.t3, background: c.sub, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Coming Soon</span>
                            )}
                          </div>
                          <p style={{ fontSize: '9.5px', color: c.t2, marginTop: '1px' }}>{fn.desc}</p>
                        </div>
                        {fn.active && <ChevronRight style={{ width: '13px', height: '13px', color: c.t3, flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MENU */}
            {screen === 'menu' && (
              <div className="px-3.5 pb-4">
                <p className="mt-0.5 mb-3" style={{ fontSize: '21px', fontWeight: 700, color: c.t1, letterSpacing: '-0.3px' }}>Menu</p>

                <button type="button" className="w-full flex items-center gap-2.5 rounded-xl p-2.5 mb-4 text-left" style={{ background: c.card }}>
                  <div className="flex items-center justify-center rounded-xl" style={{ width: '36px', height: '36px', background: '#DBEAFE' }}>
                    <User style={{ width: '16px', height: '16px', color: c.blue }} />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: '12px', fontWeight: 600, color: c.t1 }}>Ditesh Patel</p>
                    <p style={{ fontSize: '9px', color: c.t2 }}>support@imperialtrends.uk</p>
                    <span className="inline-block mt-[2px] rounded px-1 py-[1px]" style={{ fontSize: '7.5px', fontWeight: 600, color: c.blue, background: '#DBEAFE' }}>Owner</span>
                  </div>
                  <ChevronRight style={{ width: '13px', height: '13px', color: c.t3 }} />
                </button>

                <div className="mb-4">
                  <p className="px-0.5 mb-1.5" style={{ fontSize: '8px', fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Account</p>
                  <div className="rounded-xl overflow-hidden" style={{ background: c.card }}>
                    <button type="button" className="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left" style={{ borderBottom: `0.5px solid ${c.div}` }}>
                      <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: '28px', height: '28px', background: c.sub }}>
                        <Settings style={{ width: '13px', height: '13px', color: c.t2 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '11px', fontWeight: 500, color: c.t1 }}>User Profile</p>
                        <p style={{ fontSize: '8.5px', color: c.t2 }}>Name, business details</p>
                      </div>
                      <ChevronRight style={{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }} />
                    </button>
                    <button type="button" className="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left">
                      <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: '28px', height: '28px', background: c.sub }}>
                        <Sun style={{ width: '13px', height: '13px', color: c.t2 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '11px', fontWeight: 500, color: c.t1 }}>Appearance</p>
                        <p style={{ fontSize: '8.5px', color: c.t2 }}>{dark ? 'Dark mode' : 'Light mode'}</p>
                      </div>
                      <ChevronRight style={{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="px-0.5 mb-1.5" style={{ fontSize: '8px', fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Tools</p>
                  <div className="rounded-xl overflow-hidden" style={{ background: c.card }}>
                    {toolItems.map((t, i) => {
                      const Icon = t.icon;
                      return (
                        <button key={t.title} type="button" className="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left" style={{ borderBottom: i < toolItems.length - 1 ? `0.5px solid ${c.div}` : 'none' }}>
                          <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: '28px', height: '28px', background: c.sub }}>
                            <Icon style={{ width: '13px', height: '13px', color: c.t2 }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: '11px', fontWeight: 500, color: c.t1 }}>{t.title}</p>
                            {t.sub && <p style={{ fontSize: '8.5px', color: c.t2 }}>{t.sub}</p>}
                          </div>
                          <ChevronRight style={{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="px-0.5 mb-1.5" style={{ fontSize: '8px', fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Alerts</p>
                  <div className="rounded-xl overflow-hidden" style={{ background: c.card }}>
                    <button type="button" className="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left">
                      <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: '28px', height: '28px', background: c.sub }}>
                        <AlertTriangle style={{ width: '13px', height: '13px', color: c.t2 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '11px', fontWeight: 500, color: c.t1 }}>Low Stock Alerts</p>
                      </div>
                      <ChevronRight style={{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20" style={{ background: c.tabBg, borderTop: `0.5px solid ${c.div}` }}>
            <div className="flex items-end justify-around px-1 pt-[2px] pb-[10px]">
              <button type="button" className="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" onClick={() => setScreen('home')}>
                <Home style={{ width: '17px', height: '17px', color: screen === 'home' ? c.blue : c.tabOff }} strokeWidth={screen === 'home' ? 2.1 : 1.6} />
                <span style={{ fontSize: '8.5px', color: screen === 'home' ? c.blue : c.tabOff, fontWeight: screen === 'home' ? 600 : 400 }}>Home</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" onClick={() => setScreen('inventory')}>
                <Hexagon style={{ width: '17px', height: '17px', color: screen === 'inventory' ? c.blue : c.tabOff }} strokeWidth={screen === 'inventory' ? 2.1 : 1.6} />
                <span style={{ fontSize: '8.5px', color: screen === 'inventory' ? c.blue : c.tabOff, fontWeight: screen === 'inventory' ? 600 : 400 }}>Inventory</span>
              </button>
              <button type="button" className="flex flex-col items-center -mt-[18px]" onClick={() => setScreen('functions')}>
                <div className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center" style={{ background: c.blue, boxShadow: `0 4px 14px ${c.blue}50` }}>
                  <Grid3x3 className="text-white" style={{ width: '18px', height: '18px' }} />
                </div>
              </button>
              <button type="button" className="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" onClick={() => setScreen('functions')}>
                <Layers style={{ width: '17px', height: '17px', color: screen === 'functions' ? c.blue : c.tabOff }} strokeWidth={screen === 'functions' ? 2.1 : 1.6} />
                <span style={{ fontSize: '8.5px', color: screen === 'functions' ? c.blue : c.tabOff, fontWeight: screen === 'functions' ? 600 : 400 }}>Functions</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" onClick={() => setScreen('menu')}>
                <MenuIcon style={{ width: '17px', height: '17px', color: screen === 'menu' ? c.blue : c.tabOff }} strokeWidth={screen === 'menu' ? 2.1 : 1.6} />
                <span style={{ fontSize: '8.5px', color: screen === 'menu' ? c.blue : c.tabOff, fontWeight: screen === 'menu' ? 600 : 400 }}>Menu</span>
              </button>
            </div>
          </div>

          {/* Add modal */}
          {showAdd && (
            <div className="absolute inset-0 z-40 flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
              <div className="w-full rounded-t-[20px] px-4 pt-4 pb-[72px]" style={{ background: c.card }}>
                <div className="flex items-center justify-between mb-3.5">
                  <span style={{ color: c.t1, fontSize: '13px', fontWeight: 600 }}>Add New Item</span>
                  <button type="button" className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: c.div }} onClick={() => setShowAdd(false)}>
                    <X style={{ width: '12px', height: '12px', color: c.t2 }} />
                  </button>
                </div>
                <div className="space-y-2.5">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Item name" className="w-full px-2.5 py-[7px] rounded-lg focus:outline-none" style={{ background: c.sub, color: c.t1, fontSize: '11px', border: 'none' }} />
                  <div className="flex gap-2">
                    <input value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="Qty" type="number" className="w-1/2 px-2.5 py-[7px] rounded-lg focus:outline-none" style={{ background: c.sub, color: c.t1, fontSize: '11px', border: 'none' }} />
                    <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Price £" type="number" step="0.01" className="w-1/2 px-2.5 py-[7px] rounded-lg focus:outline-none" style={{ background: c.sub, color: c.t1, fontSize: '11px', border: 'none' }} />
                  </div>
                  <button type="button" className="w-full text-white py-[7px] rounded-lg" style={{ background: c.blue, fontSize: '11px', fontWeight: 500 }} onClick={addItem}>Add to Inventory</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Home indicator bar */}
      <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[90px] h-[3px] rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.35)' }} />
    </div>
  );
}
