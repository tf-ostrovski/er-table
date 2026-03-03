<template>
  <Teleport to="body">
    <transition name="drawer">
      <div v-if="active" class="drawer-overlay" @click.self="$emit('close')">
        <aside class="drawer">
          <header class="drawer__header">
            <span class="drawer__title">{{ title }}</span>
            <button class="drawer__close" @click="$emit('close')">&times;</button>
          </header>

          <div class="drawer__body">
            <div
              v-for="col in fields"
              :key="col.field"
              class="drawer__field"
            >
              <label class="drawer__label">{{ col.name || col.field }}</label>
              <div class="drawer__value">
                <input
                  v-if="isEditable(col)"
                  class="drawer__input"
                  :type="inputType(col)"
                  :value="getVal(col.field)"
                  @input="onInput(col, ($event.target as HTMLInputElement).value)"
                />
                <span v-else class="drawer__readonly">{{ getDisplay(col.field) }}</span>
              </div>
            </div>
          </div>

          <footer class="drawer__footer">
            <button class="drawer__cancel" @click="$emit('close')">Cancel</button>
            <button class="drawer__save" @click="save">
              <span v-if="saving" class="drawer__save-spinner"></span>
              <span v-else>Save</span>
            </button>
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
/* ═══════════════════════════════════════════════════════
   Detail Drawer — BEM
   Block: .drawer
   ═══════════════════════════════════════════════════════ */

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(2px);
}

.drawer {
  width: 480px;
  max-width: 90vw;
  height: 100%;
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #171717);
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
}

.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--theme--border-color, #e2e2e2);
  flex-shrink: 0;
}

.drawer__title {
  font-size: 18px;
  font-weight: 700;
}

.drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--theme--foreground-subdued, #999);
  font-size: 24px;
  line-height: 1;
  transition: all 0.15s;
}

.drawer__close:hover {
  background: var(--theme--background-accent, #f0f0f0);
  color: var(--theme--foreground, #171717);
}

.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drawer__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--theme--foreground-subdued, #999);
}

.drawer__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--theme--border-color, #e2e2e2);
  border-radius: 6px;
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #171717);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.drawer__input:focus {
  border-color: var(--theme--primary, #6644ff);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme--primary, #6644ff) 20%, transparent);
}

.drawer__readonly {
  font-size: 14px;
  padding: 10px 0;
  color: var(--theme--foreground-subdued, #999);
  word-break: break-all;
}

.drawer__footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--theme--border-color, #e2e2e2);
  flex-shrink: 0;
}

.drawer__cancel {
  flex: 1;
  padding: 10px;
  background: var(--theme--background);
  color: var(--theme--foreground);
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.drawer__cancel:hover {
  background: var(--theme--background-accent);
}

.drawer__save {
  flex: 2;
  padding: 10px;
  background: var(--theme--primary, #6644ff);
  color: var(--theme--primary-foreground, #fff);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer__save:hover {
  opacity: 0.85;
}

.drawer__save-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: drawer-spin 0.6s linear infinite;
}

@keyframes drawer-spin {
  to { transform: rotate(360deg); }
}

/* ── Transition ──────────────────────────────────── */

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer {
  transform: translateX(100%);
}

.drawer-leave-to .drawer {
  transform: translateX(100%);
}
</style>
