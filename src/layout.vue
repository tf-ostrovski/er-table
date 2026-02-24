<template>
  <div class="vp-root" :class="`vp-spacing-${spacing}`">
    <!-- Empty / Loading states -->
    <div v-if="loading && (!items || items.length === 0)" class="vp-empty">
      Loading...
    </div>
    <div v-else-if="!items || items.length === 0" class="vp-empty">
      No items to display
    </div>

    <!-- Table -->
    <div v-else class="vp-scroll">
      <table class="vp-table">
        <thead>
          <tr>
            <th class="vp-th vp-col-check">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected && !allSelected"
                @change="selectAll"
              />
            </th>
            <th class="vp-th vp-col-open">&nbsp;</th>
            <th
              v-for="col in visibleFields"
              :key="col.field"
              class="vp-th"
              @click="toggleSort(col.field)"
            >
              {{ col.name || col.field }}
              <span v-if="sortField === col.field" class="vp-sort">
                {{ sortDir === 'asc' ? '\u25B2' : '\u25BC' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item[pkField]"
            :class="{ 'vp-row-sel': isSelected(item[pkField]) }"
          >
            <td class="vp-td vp-col-check">
              <input
                type="checkbox"
                :checked="isSelected(item[pkField])"
                @change="toggleSelection(item[pkField])"
              />
            </td>
            <td class="vp-td vp-col-open">
              <button class="vp-open-btn" title="Open details" @click="openDrawer(item)">
                &#x279C;
              </button>
            </td>
            <EditableCell
              v-for="col in visibleFields"
              :key="col.field"
              :value="getCellValue(item, col.field)"
              :field="col.field"
              :field-type="col.type || 'string'"
              :readonly="isReadonly(col)"
              :is-dirty="isCellDirty(item[pkField], col.field)"
              :is-saving="savingKeys.has(item[pkField])"
              @edit="(payload: any) => onCellEdit(item[pkField], payload)"
            />
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="vp-footer" v-if="items && items.length > 0">
      <div class="vp-pager">
        <button class="vp-pg-btn" :disabled="page <= 1" @click="page = page - 1">&larr; Prev</button>
        <span class="vp-pg-info">Page {{ page }} / {{ totalPages || 1 }}</span>
        <button class="vp-pg-btn" :disabled="page >= (totalPages || 1)" @click="page = page + 1">Next &rarr;</button>
      </div>
      <select class="vp-pg-size" :value="limit" @change="limit = Number(($event.target as HTMLSelectElement).value)">
        <option v-for="s in [10, 25, 50, 100]" :key="s" :value="s">{{ s }} / page</option>
      </select>
    </div>

    <!-- Detail Drawer -->
    <DetailDrawer
      :active="drawerOpen"
      :collection="collection"
      :item="drawerItem"
      :fields="allFields"
      :primary-key-field="pkField"
      @close="drawerOpen = false"
      @saved="onDrawerSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import EditableCell from './editable-cell.vue';
import DetailDrawer from './detail-drawer.vue';

const props = defineProps<{
  collection: string;
  fieldsInfo: any[];
  primaryKeyField: any;
  items: any[];
  loading: boolean;
  totalPages: number;
  itemCount: number;
  totalCount: number;
  page: number;
  limit: number;
  sort: string[];
  fields: string[];
  spacing: 'compact' | 'cozy' | 'comfortable';
  autoSave: boolean;
  autoSaveDelay: number;
  selection: (string | number)[];
  pendingEdits: Map<string | number, Record<string, any>>;
  savingKeys: Set<string | number>;
  refresh: () => void;
}>();

const emit = defineEmits<{
  (e: 'update:page', val: number): void;
  (e: 'update:limit', val: number): void;
  (e: 'update:sort', val: string[]): void;
  (e: 'update:selection', val: (string | number)[]): void;
}>();

const directusApi = useApi();

const pkField = computed(() => props.primaryKeyField?.field || 'id');
const readonlyTypes = ['alias', 'json', 'o2m', 'm2m', 'm2a'];

const visibleFields = computed(() => {
  if (!props.fieldsInfo) return [];
  return props.fieldsInfo.filter((f: any) => {
    if (f.meta?.hidden) return false;
    if (readonlyTypes.includes(f.type) && f.field !== pkField.value) return false;
    return props.fields.includes('*') || props.fields.includes(f.field);
  });
});

const allFields = computed(() => {
  if (!props.fieldsInfo) return [];
  return props.fieldsInfo.filter((f: any) => !f.meta?.hidden);
});

const sortField = computed(() => {
  if (!props.sort || props.sort.length === 0) return null;
  const s = props.sort[0];
  return s.startsWith('-') ? s.slice(1) : s;
});

const sortDir = computed(() => {
  if (!props.sort || props.sort.length === 0) return null;
  return props.sort[0].startsWith('-') ? 'desc' : 'asc';
});

const page = computed({
  get: () => props.page,
  set: (val) => emit('update:page', val),
});

const limit = computed({
  get: () => props.limit,
  set: (val) => emit('update:limit', val),
});

// Selection
const allSelected = computed(() => {
  if (!props.items || props.items.length === 0) return false;
  return props.items.every((item: any) => props.selection?.includes(item[pkField.value]));
});

const someSelected = computed(() => {
  if (!props.items || !props.selection) return false;
  return props.items.some((item: any) => props.selection.includes(item[pkField.value]));
});

function isSelected(pk: string | number) {
  return props.selection?.includes(pk) || false;
}

function toggleSelection(pk: string | number) {
  const current = props.selection || [];
  if (current.includes(pk)) {
    emit('update:selection', current.filter((k) => k !== pk));
  } else {
    emit('update:selection', [...current, pk]);
  }
}

function selectAll() {
  if (!props.items) return;
  if (allSelected.value) {
    emit('update:selection', []);
  } else {
    emit('update:selection', props.items.map((item: any) => item[pkField.value]));
  }
}

function toggleSort(field: string) {
  const current = props.sort || [];
  if (current.length > 0 && current[0] === field) {
    emit('update:sort', [`-${field}`]);
  } else if (current.length > 0 && current[0] === `-${field}`) {
    emit('update:sort', []);
  } else {
    emit('update:sort', [field]);
  }
}

// Cell values
function getCellValue(item: any, field: string) {
  const pk = item[pkField.value];
  const pending = props.pendingEdits.get(pk);
  if (pending && field in pending) return pending[field];
  return item[field];
}

function isReadonly(col: any) {
  if (col.field === pkField.value) return true;
  if (col.schema?.is_generated) return true;
  if (readonlyTypes.includes(col.type)) return true;
  return false;
}

function isCellDirty(pk: string | number, field: string) {
  const pending = props.pendingEdits.get(pk);
  return pending ? field in pending : false;
}

// Inline edit & auto-save
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function onCellEdit(pk: string | number, payload: { field: string; value: any }) {
  const current = props.pendingEdits.get(pk) || {};
  current[payload.field] = payload.value;
  props.pendingEdits.set(pk, current);

  if (props.autoSave) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flushEdits(), props.autoSaveDelay);
  }
}

async function flushEdits() {
  if (!directusApi || props.pendingEdits.size === 0) return;
  const entries = Array.from(props.pendingEdits.entries());
  for (const [pk, edits] of entries) {
    props.savingKeys.add(pk);
    try {
      await directusApi.patch(`/items/${props.collection}/${pk}`, edits);
      props.pendingEdits.delete(pk);
    } catch (err) {
      console.error(`[viewport] save failed for ${pk}:`, err);
    } finally {
      props.savingKeys.delete(pk);
    }
  }
}

// Detail drawer
const drawerOpen = ref(false);
const drawerItem = ref<Record<string, any> | null>(null);

function openDrawer(item: Record<string, any>) {
  drawerItem.value = { ...item };
  drawerOpen.value = true;
}

function onDrawerSaved() {
  props.refresh();
}

defineExpose({ flushEdits });
</script>

<style scoped>
.vp-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--theme--foreground);
  font-size: 14px;
}

.vp-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--theme--foreground-subdued);
}

/* ── Scrollable table area ── */
.vp-scroll {
  flex: 1;
  overflow: auto;
}

.vp-table {
  width: 100%;
  border-collapse: collapse;
  color: inherit;
}

/* ── Header ── */
.vp-th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--theme--background-accent);
  padding: 0 12px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  color: var(--theme--foreground-subdued);
  border-bottom: 2px solid var(--theme--border-color);
  border-right: 1px solid var(--theme--border-color);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.vp-th:hover {
  color: var(--theme--foreground);
}

.vp-sort {
  font-size: 10px;
  margin-left: 2px;
}

/* ── Fixed-width columns ── */
.vp-col-check {
  width: 40px;
  text-align: center;
  padding: 0;
  cursor: default;
}

.vp-col-open {
  width: 36px;
  text-align: center;
  padding: 0;
  cursor: default;
}

/* ── Body cells ── */
.vp-td {
  border-right: 1px solid var(--theme--border-color);
  border-bottom: 1px solid var(--theme--border-color);
  vertical-align: middle;
  color: inherit;
}

/* ── Row hover & selection ── */
.vp-table tbody tr:hover {
  background: var(--theme--background-accent);
}

.vp-row-sel {
  background: color-mix(in srgb, var(--theme--primary) 8%, transparent);
}

/* ── Open-detail button ── */
.vp-open-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--theme--border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--theme--foreground-subdued);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.vp-open-btn:hover {
  background: var(--theme--primary);
  color: #fff;
  border-color: var(--theme--primary);
}

/* ── Spacing modes (applied to th, td, and child component root <td>) ── */
.vp-spacing-compact .vp-table :deep(th),
.vp-spacing-compact .vp-table :deep(td) {
  height: 32px;
  line-height: 32px;
}

.vp-spacing-cozy .vp-table :deep(th),
.vp-spacing-cozy .vp-table :deep(td) {
  height: 48px;
  line-height: 48px;
}

.vp-spacing-comfortable .vp-table :deep(th),
.vp-spacing-comfortable .vp-table :deep(td) {
  height: 64px;
  line-height: 64px;
}

/* ── Pagination footer ── */
.vp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--theme--border-color);
  background: var(--theme--background);
  flex-shrink: 0;
}

.vp-pager {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vp-pg-btn {
  padding: 4px 10px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius, 4px);
  background: var(--theme--background);
  color: var(--theme--foreground);
  cursor: pointer;
  font-size: 13px;
}

.vp-pg-btn:hover:not(:disabled) {
  background: var(--theme--background-accent);
}

.vp-pg-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.vp-pg-info {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
}

.vp-pg-size {
  padding: 4px 8px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius, 4px);
  background: var(--theme--background);
  color: var(--theme--foreground);
  font-size: 13px;
}
</style>
