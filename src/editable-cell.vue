<template>
  <td
    :class="cellClass"
    @dblclick="startEdit"
  >
    <template v-if="editing">
      <input
        ref="inputEl"
        v-model="editValue"
        class="vp-cell-input"
        :type="inputType"
        @blur="commitEdit"
        @keydown.enter="commitEdit"
        @keydown.escape="cancelEdit"
      />
    </template>
    <template v-else>
      <span v-if="isSaving" class="vp-saving-dot"></span>
      <span class="vp-cell-text">{{ displayValue }}</span>
    </template>
  </td>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

const props = defineProps<{
  value: any;
  field: string;
  fieldType: string;
  readonly?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit', payload: { field: string; value: any }): void;
}>();

const editing = ref(false);
const editValue = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

const inputType = computed(() => {
  if (['integer', 'bigInteger', 'float', 'decimal'].includes(props.fieldType)) return 'number';
  return 'text';
});

const displayValue = computed(() => {
  const v = props.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
});

const cellClass = computed(() => [
  'vp-cell',
  {
    'vp-cell--dirty': props.isDirty,
    'vp-cell--saving': props.isSaving,
    'vp-cell--ro': props.readonly,
  },
]);

function startEdit() {
  if (props.readonly) return;
  if (['alias', 'json', 'o2m', 'm2m', 'm2a'].includes(props.fieldType)) return;
  editing.value = true;
  editValue.value = displayValue.value;
  nextTick(() => {
    inputEl.value?.focus();
    inputEl.value?.select();
  });
}

function coerceValue(raw: string): any {
  if (raw === '') return null;
  if (['integer', 'bigInteger'].includes(props.fieldType)) {
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }
  if (['float', 'decimal'].includes(props.fieldType)) {
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }
  if (props.fieldType === 'boolean') return raw === 'true' || raw === '1';
  return raw;
}

function commitEdit() {
  if (!editing.value) return;
  editing.value = false;
  const coerced = coerceValue(editValue.value);
  // Compare as strings to avoid type mismatch false positives
  if (String(coerced ?? '') !== String(props.value ?? '')) {
    emit('edit', { field: props.field, value: coerced });
  }
}

function cancelEdit() {
  editing.value = false;
}
</script>

<style scoped>
.vp-cell {
  padding: 0 12px;
  border-right: 1px solid var(--theme--border-color, #e2e2e2);
  border-bottom: 1px solid var(--theme--border-color, #e2e2e2);
  vertical-align: middle;
  color: inherit;
}

.vp-cell:not(.vp-cell--ro) {
  cursor: cell;
}

.vp-cell--dirty {
  background: color-mix(in srgb, var(--theme--warning, #ffc107) 12%, transparent);
}

.vp-cell--saving {
  opacity: 0.6;
}

.vp-cell-text {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.vp-cell-input {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  outline: none;
  box-shadow: inset 0 0 0 2px var(--theme--primary, #6644ff);
  border-radius: 4px;
  line-height: inherit;
  height: calc(100% - 4px);
}

.vp-saving-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme--primary, #6644ff);
  animation: vp-pulse 0.8s infinite alternate;
  vertical-align: middle;
  margin-right: 4px;
}

@keyframes vp-pulse {
  from { opacity: 0.3; }
  to { opacity: 1; }
}
</style>
