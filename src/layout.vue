<template>
  <div class="viewport" :class="`viewport--${spacing}`">
    <!-- Empty / Loading states -->
    <div v-if="loading && (!items || items.length === 0)" class="viewport__empty">
      <svg class="viewport__empty-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2l.01 6L10 12l-3.99 4.01L6 22h12v-6l-4-4 4-3.99V2H6zm10 14.5V20H8v-3.5l4-4 4 4z"/></svg>
      <div class="viewport__empty-text">Loading...</div>
    </div>
    <div v-else-if="!items || items.length === 0" class="viewport__empty">
      <svg class="viewport__empty-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 009.5 3S3 3 3 9.5 9.5 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      <div class="viewport__empty-text">No items to display</div>
    </div>

    <!-- Table -->
    <div v-else class="viewport__scroll">
      <table class="viewport__table">
        <thead>
          <tr>
            <th class="viewport__th viewport__th--check">
              <label class="viewport__checkbox">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate="someSelected && !allSelected"
                  @change="selectAll"
                />
                <span class="viewport__checkbox-mark"></span>
              </label>
            </th>
            <th class="viewport__th viewport__th--open"></th>
            <th
              v-for="col in visibleFields"
              :key="col.field"
              class="viewport__th"
              :class="{
                'viewport__th--sorted': sortField === col.field,
              }"
              @click="toggleSort(col.field)"
            >
              <span class="viewport__th-label">{{ col.name || col.field }}</span>
              <span v-if="sortField === col.field" class="viewport__th-sort">
                {{ sortDir === 'asc' ? '\u25B2' : '\u25BC' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item[pkField]"
            class="viewport__row"
            :class="{ 'viewport__row--selected': isSelected(item[pkField]) }"
          >
            <td class="viewport__td viewport__td--check">
              <label class="viewport__checkbox">
                <input
                  type="checkbox"
                  :checked="isSelected(item[pkField])"
                  @change="toggleSelection(item[pkField])"
                />
                <span class="viewport__checkbox-mark"></span>
              </label>
            </td>
            <td class="viewport__td viewport__td--open">
              <button class="viewport__open-btn" title="Open details" @click="openDrawer(item)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
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
    <div class="viewport__footer" v-if="items && items.length > 0">
      <div class="viewport__pager">
        <button
          class="viewport__pager-btn"
          :disabled="page <= 1"
          @click="page = page - 1"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <span class="viewport__pager-info">{{ page }} / {{ totalPages || 1 }}</span>
        <button
          class="viewport__pager-btn"
          :disabled="page >= (totalPages || 1)"
          @click="page = page + 1"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>
      <select class="viewport__page-size" :value="limit" @change="limit = Number(($event.target as HTMLSelectElement).value)">
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
/* ═══════════════════════════════════════════════════════
   Viewport Layout — BEM
   Block: .viewport
   ═══════════════════════════════════════════════════════ */

.viewport {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--theme--foreground);
  font-family: var(--theme--fonts--sans--font-family, system-ui, sans-serif);
  font-size: 14px;
}

/* ── Empty / loading ─────────────────────────────── */

.viewport__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 8px;
  color: var(--theme--foreground-subdued);
}

.viewport__empty-icon {
  width: 48px;
  height: 48px;
  opacity: 0.35;
}

.viewport__empty-text {
  font-size: 14px;
}

/* ── Scrollable area ─────────────────────────────── */

.viewport__scroll {
  flex: 1;
  overflow: auto;
}

.viewport__table {
  width: 100%;
  border-collapse: collapse;
  color: inherit;
}

/* ── Header cells ────────────────────────────────── */

.viewport__th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--theme--background-accent);
  padding: 0 12px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--theme--foreground-subdued);
  border-bottom: 2px solid var(--theme--border-color);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}

.viewport__th:hover {
  color: var(--theme--foreground);
}

.viewport__th--sorted {
  color: var(--theme--primary);
}

.viewport__th--check,
.viewport__th--open {
  cursor: default;
  width: 44px;
  text-align: center;
  padding: 0;
}

.viewport__th-label {
  vertical-align: middle;
}

.viewport__th-sort {
  font-size: 9px;
  margin-left: 4px;
  vertical-align: middle;
}

/* ── Body rows ───────────────────────────────────── */

.viewport__row {
  transition: background-color 0.1s;
}

.viewport__row:hover {
  background: var(--theme--background-accent);
}

.viewport__row--selected {
  background: color-mix(in srgb, var(--theme--primary) 8%, transparent);
}

.viewport__row--selected:hover {
  background: color-mix(in srgb, var(--theme--primary) 12%, transparent);
}

/* ── Body cells ──────────────────────────────────── */

.viewport__td {
  border-bottom: 1px solid var(--theme--border-color);
  vertical-align: middle;
  color: inherit;
}

.viewport__td--check,
.viewport__td--open {
  width: 44px;
  text-align: center;
  padding: 0;
}

/* ── Custom checkbox ─────────────────────────────── */

.viewport__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  width: 20px;
  height: 20px;
}

.viewport__checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.viewport__checkbox-mark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--theme--border-color);
  border-radius: 4px;
  transition: all 0.15s;
  position: relative;
  flex-shrink: 0;
}

.viewport__checkbox input:checked + .viewport__checkbox-mark {
  background: var(--theme--primary);
  border-color: var(--theme--primary);
}

.viewport__checkbox input:checked + .viewport__checkbox-mark::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 5px;
  width: 5px;
  height: 9px;
  border: solid var(--theme--primary-foreground, #fff);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.viewport__checkbox input:indeterminate + .viewport__checkbox-mark {
  background: var(--theme--primary);
  border-color: var(--theme--primary);
}

.viewport__checkbox input:indeterminate + .viewport__checkbox-mark::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 3px;
  width: 8px;
  height: 0;
  border: solid var(--theme--primary-foreground, #fff);
  border-width: 0 0 2px 0;
}

.viewport__checkbox:hover .viewport__checkbox-mark {
  border-color: var(--theme--primary);
}

/* ── Open-detail button ──────────────────────────── */

.viewport__open-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--theme--foreground-subdued);
  cursor: pointer;
  transition: all 0.15s;
  opacity: 0;
}

.viewport__row:hover .viewport__open-btn {
  opacity: 1;
}

.viewport__open-btn:hover {
  background: var(--theme--primary);
  color: var(--theme--primary-foreground, #fff);
}

/* ── Spacing variants ────────────────────────────── */

.viewport--compact .viewport__table :deep(th),
.viewport--compact .viewport__table :deep(td) {
  height: 36px;
  line-height: 36px;
}

.viewport--cozy .viewport__table :deep(th),
.viewport--cozy .viewport__table :deep(td) {
  height: 48px;
  line-height: 48px;
}

.viewport--comfortable .viewport__table :deep(th),
.viewport--comfortable .viewport__table :deep(td) {
  height: 60px;
  line-height: 60px;
}

/* ── Pagination footer ───────────────────────────── */

.viewport__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 2px solid var(--theme--border-color);
  background: var(--theme--background);
  flex-shrink: 0;
}

.viewport__pager {
  display: flex;
  align-items: center;
  gap: 4px;
}

.viewport__pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  background: var(--theme--background);
  color: var(--theme--foreground);
  cursor: pointer;
  transition: all 0.15s;
}

.viewport__pager-btn:hover:not(:disabled) {
  background: var(--theme--background-accent);
  border-color: var(--theme--primary);
  color: var(--theme--primary);
}

.viewport__pager-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.viewport__pager-info {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
  padding: 0 8px;
  min-width: 60px;
  text-align: center;
}

.viewport__page-size {
  padding: 6px 10px;
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  background: var(--theme--background);
  color: var(--theme--foreground);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

.viewport__page-size:hover,
.viewport__page-size:focus {
  border-color: var(--theme--primary);
  outline: none;
}
</style>
