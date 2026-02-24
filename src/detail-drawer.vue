<template>
  <Teleport to="body">
    <transition name="vp-drawer">
      <div v-if="active" class="vp-drawer-overlay" @click.self="$emit('close')">
        <aside class="vp-drawer">
          <header class="vp-drawer-header">
            <span class="vp-drawer-title">{{ title }}</span>
            <button class="vp-drawer-close" @click="$emit('close')">&#x2715;</button>
          </header>

          <div class="vp-drawer-body">
            <div
              v-for="col in fields"
              :key="col.field"
              class="vp-drawer-field"
            >
              <label class="vp-drawer-label">{{ col.name || col.field }}</label>
              <div class="vp-drawer-value">
                <input
                  v-if="isEditable(col)"
                  class="vp-drawer-input"
                  :type="inputType(col)"
                  :value="getVal(col.field)"
                  @input="onInput(col, ($event.target as HTMLInputElement).value)"
                />
                <span v-else class="vp-drawer-readonly">{{ getDisplay(col.field) }}</span>
              </div>
            </div>
          </div>

          <footer class="vp-drawer-footer">
            <button class="vp-drawer-save" @click="save">Save</button>
          </footer>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = defineProps<{
  active: boolean;
  collection: string;
  item: Record<string, any> | null;
  fields: any[];
  primaryKeyField: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const api = useApi();
const edits = ref<Record<string, any>>({});
const saving = ref(false);

const readonlyTypes = ['alias', 'json', 'o2m', 'm2m', 'm2a'];

const title = ref('');
watch(
  () => props.item,
  (item) => {
    edits.value = {};
    if (item && props.primaryKeyField) {
      title.value = `#${item[props.primaryKeyField]}`;
    } else {
      title.value = 'Details';
    }
  },
);

function isEditable(col: any): boolean {
  if (col.field === props.primaryKeyField) return false;
  if (col.schema?.is_generated) return false;
  if (readonlyTypes.includes(col.type)) return false;
  return true;
}

function inputType(col: any): string {
  if (['integer', 'bigInteger', 'float', 'decimal'].includes(col.type)) return 'number';
  return 'text';
}

function getVal(field: string): any {
  if (field in edits.value) return edits.value[field];
  return props.item?.[field] ?? '';
}

function getDisplay(field: string): string {
  const v = props.item?.[field];
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function onInput(col: any, raw: string) {
  let val: any = raw;
  if (['integer', 'bigInteger'].includes(col.type)) {
    val = raw === '' ? null : parseInt(raw, 10);
  } else if (['float', 'decimal'].includes(col.type)) {
    val = raw === '' ? null : parseFloat(raw);
  } else if (col.type === 'boolean') {
    val = raw === 'true' || raw === '1';
  }
  edits.value[col.field] = val;
}

async function save() {
  if (!props.item || Object.keys(edits.value).length === 0) {
    emit('close');
    return;
  }
  saving.value = true;
  const pk = props.item[props.primaryKeyField];
  try {
    await api.patch(`/items/${props.collection}/${pk}`, edits.value);
    edits.value = {};
    emit('saved');
    emit('close');
  } catch (err) {
    console.error('[viewport] drawer save failed:', err);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.vp-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: flex-end;
}

.vp-drawer {
  width: 480px;
  max-width: 90vw;
  height: 100%;
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #171717);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
}

.vp-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--theme--border-color, #e2e2e2);
  flex-shrink: 0;
}

.vp-drawer-title {
  font-size: 18px;
  font-weight: 700;
}

.vp-drawer-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--theme--foreground-subdued, #999);
  padding: 4px 8px;
  border-radius: 4px;
}

.vp-drawer-close:hover {
  background: var(--theme--background-accent, #f0f0f0);
  color: var(--theme--foreground, #171717);
}

.vp-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vp-drawer-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vp-drawer-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--theme--foreground-subdued, #999);
}

.vp-drawer-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--theme--border-color, #e2e2e2);
  border-radius: var(--theme--border-radius, 6px);
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #171717);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.vp-drawer-input:focus {
  border-color: var(--theme--primary, #6644ff);
}

.vp-drawer-readonly {
  font-size: 14px;
  padding: 8px 0;
  color: var(--theme--foreground-subdued, #999);
  word-break: break-all;
}

.vp-drawer-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--theme--border-color, #e2e2e2);
  flex-shrink: 0;
}

.vp-drawer-save {
  width: 100%;
  padding: 10px;
  background: var(--theme--primary, #6644ff);
  color: #fff;
  border: none;
  border-radius: var(--theme--border-radius, 6px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.vp-drawer-save:hover {
  opacity: 0.85;
}

/* Transition */
.vp-drawer-enter-active,
.vp-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.vp-drawer-enter-active .vp-drawer,
.vp-drawer-leave-active .vp-drawer {
  transition: transform 0.25s ease;
}
.vp-drawer-enter-from,
.vp-drawer-leave-to {
  opacity: 0;
}
.vp-drawer-enter-from .vp-drawer {
  transform: translateX(100%);
}
.vp-drawer-leave-to .vp-drawer {
  transform: translateX(100%);
}
</style>
