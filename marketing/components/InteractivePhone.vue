<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Home, Search, ChevronRight, TrendingUp, Package, AlertTriangle, Bell,
  Settings, User, FileText, BarChart3, Tags, Sun, X, Plus, Minus,
  FolderOpen, QrCode, ClipboardList, Layers, Menu as MenuIcon, Users,
  Grid3x3, SlidersHorizontal, LayoutGrid, MoreHorizontal, CheckSquare,
  Trophy, Hexagon,
} from "lucide-vue-next";

type Screen = "home" | "inventory" | "functions" | "menu";
type ThemeMode = "light" | "dark";

interface Item { id: string; name: string; qty: number; value: number; emoji: string; folder?: string }
interface Folder { name: string; folders: number; units: number; value: number; img: string }

const props = defineProps<{ theme: ThemeMode }>();

const dark = computed(() => props.theme === "dark");

const c = computed(() =>
  dark.value
    ? { bg: "#1A1A2E", card: "#232340", sub: "#1E1E35", t1: "#E4E4EC", t2: "#7E7E98", t3: "#50506A", blue: "#4A7BF7", tabBg: "#141428", tabOff: "#484868", div: "rgba(255,255,255,0.05)" }
    : { bg: "#F5F0EA", card: "#FFFFFF", sub: "#EDE8E1", t1: "#1A1A2E", t2: "#8C8C8C", t3: "#B5B5B5", blue: "#4A7BF7", tabBg: "#FDFBF7", tabOff: "#BFBFBF", div: "rgba(0,0,0,0.05)" }
);

const SCREENS: Screen[] = ["home", "inventory", "functions", "menu"];

const initFolders: Folder[] = [
  { name: "Haseeb", folders: 0, units: 10, value: 0, img: "📦" },
  { name: "Jamal Bukhari", folders: 0, units: 10, value: 10, img: "📋" },
];

const screen = ref<Screen>("home");
const items = ref<Item[]>([
  { id: "1", name: "Fire 2", qty: 5, value: 2.0, emoji: "🔥", folder: "Haseeb" },
  { id: "2", name: "Shrey items test", qty: 3, value: 1.5, emoji: "📦", folder: "Haseeb" },
  { id: "3", name: "Fire", qty: 2, value: 3.0, emoji: "🔥", folder: "Jamal Bukhari" },
]);
const showAdd = ref(false);
const newName = ref("");
const newQty = ref("1");
const newPrice = ref("9.99");
const toast = ref<string | null>(null);
const period = ref("7 Days");
const expandedFolder = ref<string | null>(null);

const totalQty = computed(() => items.value.reduce((s, i) => s + i.qty, 0));
const totalVal = computed(() => items.value.reduce((s, i) => s + i.qty * i.value, 0));
const lowStock = computed(() => items.value.filter((i) => i.qty < 3).length);
const sellers = computed(() => [...items.value].sort((a, b) => b.qty - a.qty).slice(0, 3));

const rc = ["#22C55E", "#94A3B8", "#F97316"];

function notify(m: string) {
  toast.value = m;
  setTimeout(() => { toast.value = null; }, 1800);
}

function goScreen(s: Screen) {
  screen.value = s;
}

function addItem() {
  if (!newName.value.trim()) return;
  items.value = [
    { id: Date.now().toString(), name: newName.value.trim(), qty: parseInt(newQty.value) || 1, value: parseFloat(newPrice.value) || 9.99, emoji: "📦" },
    ...items.value,
  ];
  const name = newName.value.trim();
  newName.value = ""; newQty.value = "1"; newPrice.value = "9.99"; showAdd.value = false;
  notify(`Added "${name}"`);
}

function adj(id: string, d: number) {
  items.value = items.value.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i);
}

function del(id: string) {
  const it = items.value.find((i) => i.id === id);
  items.value = items.value.filter((i) => i.id !== id);
  if (it) notify(`Removed "${it.name}"`);
}

function folderItems(name: string) {
  return items.value.filter((i) => i.folder === name);
}
function folderQty(f: Folder) {
  const fi = folderItems(f.name);
  return fi.reduce((s, i) => s + i.qty, 0) || f.units;
}
function folderVal(f: Folder) {
  const fi = folderItems(f.name);
  return fi.reduce((s, i) => s + i.qty * i.value, 0) || f.value;
}

const periods = ["7 Days", "14 Days", "1 Month", "Custom"];

const fns = [
  { icon: ClipboardList, title: "Pick Lists", desc: "Pick items from inventory for orders and fulfillment", active: true, soon: false },
  { icon: CheckSquare, title: "Stock Counts", desc: "Verify inventory accuracy with physical counts", active: false, soon: true },
  { icon: FileText, title: "Purchase Orders", desc: "Track orders from suppliers and receive items", active: false, soon: true },
];
</script>

<template>
  <div class="relative select-none" :style="{ width: '272px' }">
    <!-- Bezel -->
    <div
      class="rounded-[42px] p-[4px]"
      :style="{
        background: dark ? '#0C0C18' : '#1A1A2E',
        boxShadow: '0 20px 60px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.04)',
      }"
    >
      <div class="rounded-[38px] overflow-hidden relative" :style="{ height: '588px', background: c.bg }">
        <!-- Dynamic island -->
        <div
          class="absolute top-0 left-1/2 -translate-x-1/2 w-[86px] h-[22px] rounded-b-[12px] z-30"
          :style="{ background: dark ? '#0C0C18' : '#1A1A2E' }"
        />

        <!-- Status bar -->
        <div class="absolute top-0.5 left-0 right-0 z-20 px-5 h-[22px] flex items-center justify-between">
          <span :style="{ fontSize: '9px', fontWeight: 600, color: c.t1 }">6:17</span>
          <div class="flex items-center gap-[3px] opacity-50">
            <svg width="12" height="8" viewBox="0 0 12 8"><path d="M0 6h2v2H0zM3 4h2v4H3zM6 2h2v6H6zM9 0h2v8H9z" :fill="c.t1"/></svg>
            <svg width="12" height="9" viewBox="0 0 12 9"><path d="M6 0c2.8 0 5.2 1.5 6 3.8-.8 2.3-3.2 3.8-6 3.8S.8 6.1 0 3.8C.8 1.5 3.2 0 6 0z" fill="none" :stroke="c.t1" stroke-width="1"/></svg>
            <svg width="18" height="9" viewBox="0 0 18 9">
              <rect x="0" y="0" width="15" height="9" rx="2" fill="none" :stroke="c.t1" stroke-width="1"/>
              <rect x="1.5" y="1.5" width="10" height="6" rx="1" :fill="c.t1"/>
              <rect x="16" y="2.5" width="2" height="4" rx="1" :fill="c.t1" opacity="0.4"/>
            </svg>
          </div>
        </div>

        <!-- Toast -->
        <Transition name="toast">
          <div
            v-if="toast"
            class="absolute top-6 left-3 right-3 z-50 text-white py-2 px-3 rounded-xl text-center"
            :style="{ fontSize: '10px', fontWeight: 500, background: '#1A1A2E' }"
          >{{ toast }}</div>
        </Transition>

        <!-- Screen area -->
        <div
          class="pt-[26px] pb-[60px] h-full overflow-y-auto overflow-x-hidden screen-scroll"
        >
          <Transition name="screen" mode="out-in">
            <!-- HOME -->
            <div v-if="screen === 'home'" key="home" class="px-3.5 pb-4">
              <div class="mb-4 mt-0.5">
                <p :style="{ fontSize: '10px', color: c.t2 }">Good evening,</p>
                <p :style="{ fontSize: '21px', fontWeight: 700, color: c.t1, lineHeight: 1.15, letterSpacing: '-0.3px' }">Ditesh</p>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 mb-5">
                <button
                  type="button"
                  class="flex flex-col items-center justify-center gap-1 rounded-xl text-white"
                  :style="{ background: c.blue, width: '68px', height: '56px' }"
                  @click="showAdd = true"
                >
                  <Plus :style="{ width: '17px', height: '17px' }" />
                  <span :style="{ fontSize: '8.5px', fontWeight: 500 }">Add Item</span>
                </button>
                <button
                  type="button"
                  class="flex flex-col items-center justify-center gap-1 rounded-xl flex-1"
                  :style="{ background: c.card, height: '56px' }"
                  @click="goScreen('inventory')"
                >
                  <QrCode :style="{ width: '17px', height: '17px', color: c.t1 }" />
                  <span :style="{ fontSize: '8.5px', fontWeight: 500, color: c.t1 }">Scan</span>
                </button>
                <button
                  type="button"
                  class="flex flex-col items-center justify-center gap-1 rounded-xl flex-1"
                  :style="{ background: c.card, height: '56px' }"
                  @click="goScreen('functions')"
                >
                  <ClipboardList :style="{ width: '17px', height: '17px', color: c.t1 }" />
                  <span :style="{ fontSize: '8.5px', fontWeight: 500, color: c.t1 }">Pick List</span>
                </button>
              </div>

              <!-- Overview -->
              <p :style="{ fontSize: '13px', fontWeight: 600, color: c.t1, marginBottom: '8px' }">Overview</p>
              <div class="grid grid-cols-2 gap-2 mb-5">
                <div class="rounded-xl p-2.5" :style="{ background: c.card }">
                  <div class="flex items-center justify-center rounded-lg mb-2" :style="{ width: '24px', height: '24px', background: '#DBEAFE' }">
                    <Package :style="{ width: '13px', height: '13px', color: c.blue }" />
                  </div>
                  <p :style="{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }">{{ totalQty }}</p>
                  <p :style="{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }">Total Items</p>
                </div>
                <div class="rounded-xl p-2.5" :style="{ background: c.card }">
                  <div class="flex items-center justify-center rounded-lg mb-2" :style="{ width: '24px', height: '24px', background: '#D1FAE5' }">
                    <TrendingUp :style="{ width: '13px', height: '13px', color: '#22C55E' }" />
                  </div>
                  <p :style="{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }">£{{ Math.round(totalVal) }}</p>
                  <p :style="{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }">Total Value</p>
                </div>
                <div class="rounded-xl p-2.5" :style="{ background: c.card }">
                  <div class="flex items-center justify-center rounded-lg mb-2" :style="{ width: '24px', height: '24px', background: '#FEF3C7' }">
                    <AlertTriangle :style="{ width: '13px', height: '13px', color: '#F59E0B' }" />
                  </div>
                  <p :style="{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }">{{ lowStock }}</p>
                  <p :style="{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }">Low Stock</p>
                </div>
                <div class="rounded-xl p-2.5" :style="{ background: c.card }">
                  <div class="flex items-center justify-center rounded-lg mb-2" :style="{ width: '24px', height: '24px', background: '#DBEAFE' }">
                    <ClipboardList :style="{ width: '13px', height: '13px', color: c.blue }" />
                  </div>
                  <p :style="{ fontSize: '18px', fontWeight: 700, color: c.t1, lineHeight: 1, letterSpacing: '-0.3px' }">0</p>
                  <p :style="{ fontSize: '8.5px', color: c.t2, marginTop: '2px' }">Active Picks</p>
                </div>
              </div>

              <!-- Top Sellers -->
              <div class="flex items-center gap-1.5 mb-2">
                <Trophy :style="{ width: '13px', height: '13px', color: c.t1 }" />
                <span :style="{ fontSize: '13px', fontWeight: 600, color: c.t1 }">Top Sellers</span>
              </div>
              <div class="flex gap-1 mb-3">
                <button
                  v-for="p in periods"
                  :key="p"
                  type="button"
                  class="rounded-full"
                  :style="{
                    padding: '3px 9px',
                    fontSize: '8px',
                    fontWeight: period === p ? 500 : 400,
                    background: period === p ? c.blue : 'transparent',
                    color: period === p ? '#fff' : c.t3,
                    border: period === p ? 'none' : `1px solid ${c.div}`,
                  }"
                  @click="period = p"
                >{{ p }}</button>
              </div>
              <div>
                <div
                  v-for="(it, i) in sellers"
                  :key="it.id"
                  class="flex items-center py-[7px]"
                  :style="{ borderBottom: i < sellers.length - 1 ? `0.5px solid ${c.div}` : 'none' }"
                >
                  <div
                    class="flex items-center justify-center rounded-full mr-2.5"
                    :style="{ width: '22px', height: '22px', background: `${rc[i]}18`, color: rc[i] }"
                  >
                    <span :style="{ fontSize: '9px', fontWeight: 600 }">{{ i + 1 }}</span>
                  </div>
                  <span class="flex-1 truncate" :style="{ fontSize: '11px', fontWeight: 500, color: c.t1 }">{{ it.name }}</span>
                  <span :style="{ fontSize: '10px', color: c.t2 }">{{ it.qty }} sold</span>
                </div>
              </div>
            </div>

            <!-- INVENTORY -->
            <div v-else-if="screen === 'inventory'" key="inventory" class="px-3.5 pb-4">
              <div class="flex items-center justify-between mb-3 mt-0.5">
                <p :style="{ fontSize: '21px', fontWeight: 700, color: c.t1, letterSpacing: '-0.3px' }">Inventory</p>
                <div class="flex items-center gap-2.5">
                  <Search :style="{ width: '16px', height: '16px', color: c.t2 }" />
                  <SlidersHorizontal :style="{ width: '16px', height: '16px', color: c.t2 }" />
                  <LayoutGrid :style="{ width: '16px', height: '16px', color: c.t2 }" />
                </div>
              </div>

              <!-- Stats ribbon -->
              <div class="rounded-xl flex items-center mb-3" :style="{ background: c.sub, padding: '8px 4px' }">
                <div class="flex-1 text-center">
                  <p :style="{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }">FOLDERS</p>
                  <p :style="{ fontSize: '12px', fontWeight: 600, color: c.t1, marginTop: '1px' }">2</p>
                </div>
                <div class="flex-1 text-center" :style="{ borderLeft: `0.5px solid ${c.div}` }">
                  <p :style="{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }">ITEMS</p>
                  <p :style="{ fontSize: '12px', fontWeight: 600, color: c.t1, marginTop: '1px' }">{{ items.length }}</p>
                </div>
                <div class="flex-1 text-center" :style="{ borderLeft: `0.5px solid ${c.div}` }">
                  <p :style="{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }">TOTAL QTY</p>
                  <p :style="{ fontSize: '12px', fontWeight: 600, color: c.t1, marginTop: '1px' }">{{ totalQty }}</p>
                </div>
                <div class="flex-1 text-center" :style="{ borderLeft: `0.5px solid ${c.div}` }">
                  <p :style="{ fontSize: '7px', fontWeight: 500, color: c.t3, letterSpacing: '0.5px', textTransform: 'uppercase' }">TOTAL VALUE</p>
                  <p :style="{ fontSize: '12px', fontWeight: 600, color: c.blue, marginTop: '1px' }">£{{ totalVal.toFixed(2) }}</p>
                </div>
              </div>

              <!-- Folders -->
              <div class="space-y-2">
                <div v-for="f in initFolders" :key="f.name">
                  <button
                    type="button"
                    class="w-full flex items-center gap-2.5 rounded-xl p-2.5 text-left"
                    :style="{ background: c.card }"
                    @click="expandedFolder = expandedFolder === f.name ? null : f.name"
                  >
                    <div
                      class="flex items-center justify-center rounded-lg flex-shrink-0"
                      :style="{ width: '40px', height: '40px', background: c.sub, fontSize: '16px' }"
                    >{{ f.img }}</div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1 mb-[1px]">
                        <FolderOpen :style="{ width: '9px', height: '9px', color: c.blue }" />
                        <span :style="{ fontSize: '7.5px', fontWeight: 600, color: c.blue, textTransform: 'uppercase', letterSpacing: '0.3px' }">Folder</span>
                      </div>
                      <p class="truncate" :style="{ fontSize: '12px', fontWeight: 600, color: c.t1, lineHeight: 1.2 }">{{ f.name }}</p>
                      <p :style="{ fontSize: '9px', color: c.t2, marginTop: '1px' }">
                        {{ f.folders }} folders · {{ folderQty(f) }} units · £{{ folderVal(f).toFixed(2) }}
                      </p>
                    </div>
                    <MoreHorizontal :style="{ width: '14px', height: '14px', color: c.t3, flexShrink: 0 }" />
                  </button>
                  <Transition name="expand">
                    <div v-if="expandedFolder === f.name && folderItems(f.name).length > 0" class="overflow-hidden">
                      <div class="pl-3 pr-1.5 pt-1 space-y-1">
                        <div
                          v-for="it in folderItems(f.name)"
                          :key="it.id"
                          class="flex items-center gap-1.5 py-1 px-2 rounded-lg"
                          :style="{ background: c.sub }"
                        >
                          <span class="truncate flex-1" :style="{ fontSize: '10px', fontWeight: 500, color: c.t1 }">{{ it.emoji }} {{ it.name }}</span>
                          <div class="flex items-center gap-0.5">
                            <button
                              type="button"
                              class="w-5 h-5 rounded flex items-center justify-center"
                              :style="{ background: '#FEE2E2' }"
                              @click.stop="adj(it.id, -1)"
                            >
                              <Minus :style="{ width: '10px', height: '10px', color: '#ef4444' }" />
                            </button>
                            <span class="w-4 text-center" :style="{ fontSize: '10px', fontWeight: 600, color: c.t1 }">{{ it.qty }}</span>
                            <button
                              type="button"
                              class="w-5 h-5 rounded flex items-center justify-center"
                              :style="{ background: '#D1FAE5' }"
                              @click.stop="adj(it.id, 1)"
                            >
                              <Plus :style="{ width: '10px', height: '10px', color: '#059669' }" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>

              <!-- FAB -->
              <div class="flex justify-end mt-5">
                <button
                  type="button"
                  class="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  :style="{ background: c.blue, boxShadow: `0 3px 12px ${c.blue}50` }"
                  @click="showAdd = true"
                >
                  <Plus :style="{ width: '20px', height: '20px' }" />
                </button>
              </div>
            </div>

            <!-- FUNCTIONS -->
            <div v-else-if="screen === 'functions'" key="functions" class="px-3.5 pb-4">
              <div class="mb-4 mt-0.5">
                <p :style="{ fontSize: '21px', fontWeight: 700, color: c.t1, letterSpacing: '-0.3px' }">Functions</p>
                <p :style="{ fontSize: '10px', color: c.t2, marginTop: '1px' }">Manage your inventory operations</p>
              </div>
              <div class="space-y-2">
                <button
                  v-for="fn in fns"
                  :key="fn.title"
                  type="button"
                  class="w-full flex items-center gap-2.5 rounded-xl p-3 text-left"
                  :style="{ background: c.card }"
                >
                  <div
                    class="flex items-center justify-center rounded-xl flex-shrink-0"
                    :style="{ width: '36px', height: '36px', background: fn.active ? '#DBEAFE' : c.sub }"
                  >
                    <component :is="fn.icon" :style="{ width: '16px', height: '16px', color: fn.active ? c.blue : c.t3 }" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p :style="{ fontSize: '12px', fontWeight: 600, color: fn.active ? c.t1 : c.t2 }">{{ fn.title }}</p>
                      <span
                        v-if="fn.soon"
                        class="rounded px-1 py-[1px]"
                        :style="{ fontSize: '7px', fontWeight: 600, color: c.t3, background: c.sub, textTransform: 'uppercase', letterSpacing: '0.3px' }"
                      >Coming Soon</span>
                    </div>
                    <p :style="{ fontSize: '9.5px', color: c.t2, marginTop: '1px' }">{{ fn.desc }}</p>
                  </div>
                  <ChevronRight v-if="fn.active" :style="{ width: '13px', height: '13px', color: c.t3, flexShrink: 0 }" />
                </button>
              </div>
            </div>

            <!-- MENU -->
            <div v-else key="menu" class="px-3.5 pb-4">
              <p class="mt-0.5 mb-3" :style="{ fontSize: '21px', fontWeight: 700, color: c.t1, letterSpacing: '-0.3px' }">Menu</p>

              <button
                type="button"
                class="w-full flex items-center gap-2.5 rounded-xl p-2.5 mb-4 text-left"
                :style="{ background: c.card }"
              >
                <div
                  class="flex items-center justify-center rounded-xl"
                  :style="{ width: '36px', height: '36px', background: '#DBEAFE' }"
                >
                  <User :style="{ width: '16px', height: '16px', color: c.blue }" />
                </div>
                <div class="flex-1">
                  <p :style="{ fontSize: '12px', fontWeight: 600, color: c.t1 }">Ditesh Patel</p>
                  <p :style="{ fontSize: '9px', color: c.t2 }">support@imperialtrends.uk</p>
                  <span
                    class="inline-block mt-[2px] rounded px-1 py-[1px]"
                    :style="{ fontSize: '7.5px', fontWeight: 600, color: c.blue, background: '#DBEAFE' }"
                  >Owner</span>
                </div>
                <ChevronRight :style="{ width: '13px', height: '13px', color: c.t3 }" />
              </button>

              <div class="mb-4">
                <p class="px-0.5 mb-1.5" :style="{ fontSize: '8px', fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.7px' }">Account</p>
                <div class="rounded-xl overflow-hidden" :style="{ background: c.card }">
                  <button type="button" class="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left" :style="{ borderBottom: `0.5px solid ${c.div}` }">
                    <div class="flex items-center justify-center rounded-lg flex-shrink-0" :style="{ width: '28px', height: '28px', background: c.sub }">
                      <Settings :style="{ width: '13px', height: '13px', color: c.t2 }" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p :style="{ fontSize: '11px', fontWeight: 500, color: c.t1 }">User Profile</p>
                      <p :style="{ fontSize: '8.5px', color: c.t2 }">Name, business details</p>
                    </div>
                    <ChevronRight :style="{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }" />
                  </button>
                  <button type="button" class="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left">
                    <div class="flex items-center justify-center rounded-lg flex-shrink-0" :style="{ width: '28px', height: '28px', background: c.sub }">
                      <Sun :style="{ width: '13px', height: '13px', color: c.t2 }" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p :style="{ fontSize: '11px', fontWeight: 500, color: c.t1 }">Appearance</p>
                      <p :style="{ fontSize: '8.5px', color: c.t2 }">{{ dark ? 'Dark mode' : 'Light mode' }}</p>
                    </div>
                    <ChevronRight :style="{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }" />
                  </button>
                </div>
              </div>

              <div class="mb-4">
                <p class="px-0.5 mb-1.5" :style="{ fontSize: '8px', fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.7px' }">Tools</p>
                <div class="rounded-xl overflow-hidden" :style="{ background: c.card }">
                  <button v-for="(t, i) in [
                    { icon: BarChart3, title: 'Reports', sub: 'Summary, activity' },
                    { icon: QrCode, title: 'Picking Mode' },
                    { icon: Tags, title: 'Tags Management' },
                    { icon: Users, title: 'Manage Team' },
                    { icon: Bell, title: 'Notifications' },
                  ]" :key="t.title" type="button" class="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left" :style="{ borderBottom: i < 4 ? `0.5px solid ${c.div}` : 'none' }">
                    <div class="flex items-center justify-center rounded-lg flex-shrink-0" :style="{ width: '28px', height: '28px', background: c.sub }">
                      <component :is="t.icon" :style="{ width: '13px', height: '13px', color: c.t2 }" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p :style="{ fontSize: '11px', fontWeight: 500, color: c.t1 }">{{ t.title }}</p>
                      <p v-if="t.sub" :style="{ fontSize: '8.5px', color: c.t2 }">{{ t.sub }}</p>
                    </div>
                    <ChevronRight :style="{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }" />
                  </button>
                </div>
              </div>

              <div class="mb-4">
                <p class="px-0.5 mb-1.5" :style="{ fontSize: '8px', fontWeight: 600, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.7px' }">Alerts</p>
                <div class="rounded-xl overflow-hidden" :style="{ background: c.card }">
                  <button type="button" class="w-full flex items-center gap-2.5 px-2.5 py-[9px] text-left">
                    <div class="flex items-center justify-center rounded-lg flex-shrink-0" :style="{ width: '28px', height: '28px', background: c.sub }">
                      <AlertTriangle :style="{ width: '13px', height: '13px', color: c.t2 }" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p :style="{ fontSize: '11px', fontWeight: 500, color: c.t1 }">Low Stock Alerts</p>
                    </div>
                    <ChevronRight :style="{ width: '11px', height: '11px', color: c.t3, flexShrink: 0 }" />
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Tab bar -->
        <div class="absolute bottom-0 left-0 right-0 z-20" :style="{ background: c.tabBg, borderTop: `0.5px solid ${c.div}` }">
          <div class="flex items-end justify-around px-1 pt-[2px] pb-[10px]">
            <button type="button" class="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" @click="goScreen('home')">
              <Home :style="{ width: '17px', height: '17px', color: screen === 'home' ? c.blue : c.tabOff, strokeWidth: screen === 'home' ? 2.1 : 1.6 }" />
              <span :style="{ fontSize: '8.5px', color: screen === 'home' ? c.blue : c.tabOff, fontWeight: screen === 'home' ? 600 : 400 }">Home</span>
            </button>
            <button type="button" class="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" @click="goScreen('inventory')">
              <Hexagon :style="{ width: '17px', height: '17px', color: screen === 'inventory' ? c.blue : c.tabOff, strokeWidth: screen === 'inventory' ? 2.1 : 1.6 }" />
              <span :style="{ fontSize: '8.5px', color: screen === 'inventory' ? c.blue : c.tabOff, fontWeight: screen === 'inventory' ? 600 : 400 }">Inventory</span>
            </button>
            <button type="button" class="flex flex-col items-center -mt-[18px]" @click="goScreen('functions')">
              <div
                class="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center"
                :style="{ background: c.blue, boxShadow: `0 4px 14px ${c.blue}50` }"
              >
                <Grid3x3 class="text-white" :style="{ width: '18px', height: '18px' }" />
              </div>
            </button>
            <button type="button" class="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" @click="goScreen('functions')">
              <Layers :style="{ width: '17px', height: '17px', color: screen === 'functions' ? c.blue : c.tabOff, strokeWidth: screen === 'functions' ? 2.1 : 1.6 }" />
              <span :style="{ fontSize: '8.5px', color: screen === 'functions' ? c.blue : c.tabOff, fontWeight: screen === 'functions' ? 600 : 400 }">Functions</span>
            </button>
            <button type="button" class="flex flex-col items-center gap-[1px] w-[52px] py-[3px]" @click="goScreen('menu')">
              <MenuIcon :style="{ width: '17px', height: '17px', color: screen === 'menu' ? c.blue : c.tabOff, strokeWidth: screen === 'menu' ? 2.1 : 1.6 }" />
              <span :style="{ fontSize: '8.5px', color: screen === 'menu' ? c.blue : c.tabOff, fontWeight: screen === 'menu' ? 600 : 400 }">Menu</span>
            </button>
          </div>
        </div>

        <!-- Add modal -->
        <Transition name="modal-overlay">
          <div
            v-if="showAdd"
            class="absolute inset-0 z-40 flex items-end"
            :style="{ background: 'rgba(0,0,0,0.35)' }"
            @click.self="showAdd = false"
          >
            <div
              class="w-full rounded-t-[20px] px-4 pt-4 pb-[72px] modal-sheet"
              :style="{ background: c.card }"
            >
              <div class="flex items-center justify-between mb-3.5">
                <span :style="{ color: c.t1, fontSize: '13px', fontWeight: 600 }">Add New Item</span>
                <button
                  type="button"
                  class="w-6 h-6 rounded-full flex items-center justify-center"
                  :style="{ background: c.div }"
                  @click="showAdd = false"
                >
                  <X :style="{ width: '12px', height: '12px', color: c.t2 }" />
                </button>
              </div>
              <div class="space-y-2.5">
                <input
                  v-model="newName"
                  placeholder="Item name"
                  class="w-full px-2.5 py-[7px] rounded-lg focus:outline-none"
                  :style="{ background: c.sub, color: c.t1, fontSize: '11px', border: 'none' }"
                />
                <div class="flex gap-2">
                  <input
                    v-model="newQty"
                    placeholder="Qty"
                    type="number"
                    class="w-1/2 px-2.5 py-[7px] rounded-lg focus:outline-none"
                    :style="{ background: c.sub, color: c.t1, fontSize: '11px', border: 'none' }"
                  />
                  <input
                    v-model="newPrice"
                    placeholder="Price £"
                    type="number"
                    step="0.01"
                    class="w-1/2 px-2.5 py-[7px] rounded-lg focus:outline-none"
                    :style="{ background: c.sub, color: c.t1, fontSize: '11px', border: 'none' }"
                  />
                </div>
                <button
                  type="button"
                  class="w-full text-white py-[7px] rounded-lg"
                  :style="{ background: c.blue, fontSize: '11px', fontWeight: 500 }"
                  @click="addItem"
                >Add to Inventory</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Home indicator bar -->
    <div
      class="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[90px] h-[3px] rounded-full"
      :style="{ background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.35)' }"
    />
  </div>
</template>

<style scoped>
.screen-scroll { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.screen-scroll::-webkit-scrollbar { display: none; }

.screen-enter-active, .screen-leave-active { transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
.screen-enter-from { opacity: 0; transform: translateX(40px); }
.screen-leave-to { opacity: 0; transform: translateX(-40px); }

.toast-enter-active, .toast-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }

.expand-enter-active, .expand-leave-active { transition: max-height 0.16s ease, opacity 0.16s ease; max-height: 400px; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }

.modal-overlay-enter-active, .modal-overlay-leave-active { transition: opacity 0.2s ease; }
.modal-overlay-enter-from, .modal-overlay-leave-to { opacity: 0; }
.modal-overlay-enter-active .modal-sheet, .modal-overlay-leave-active .modal-sheet { transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1); }
.modal-overlay-enter-from .modal-sheet, .modal-overlay-leave-to .modal-sheet { transform: translateY(260px); }
</style>
