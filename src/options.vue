<template>
  <div class="options">
    <div class="options__group">
      <div class="options__label">Row Spacing</div>
      <div class="options__buttons">
        <button
          v-for="opt in spacingOptions"
          :key="opt.value"
          class="options__btn"
          :class="{ 'options__btn--active': spacing === opt.value }"
          @click="spacing = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="options__group">
      <div class="options__label">Auto-Save</div>
      <label class="options__toggle">
        <input type="checkbox" v-model="autoSave" class="options__toggle-input" />
        <span class="options__toggle-track">
          <span class="options__toggle-thumb"></span>
        </span>
        <span class="options__toggle-text">{{ autoSave ? 'Enabled' : 'Disabled' }}</span>
      </label>
    </div>

    <div v-if="autoSave" class="options__group">
      <div class="options__label">Save Delay (ms)</div>
      <input
        type="number"
        class="options__input"
        :value="autoSaveDelay"
        min="200"
        max="10000"
        step="100"
        @change="autoSaveDelay = Number(($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LayoutOptions } from './types';

const props = defineProps<{
  layoutOptions: LayoutOptions | null;
}>();

const emit = defineEmits<{
  (e: 'update:layoutOptions', value: LayoutOptions): void;
}>();

const spacingOptions = [
  { label: 'Compact', value: 'compact' as const },
  { label: 'Cozy', value: 'cozy' as const },
  { label: 'Comfortable', value: 'comfortable' as const },
];

const spacing = computed({
  get: () => props.layoutOptions?.spacing || 'cozy',
  set: (val) => emit('update:layoutOptions', { ...props.layoutOptions, spacing: val, autoSave: autoSave.value, autoSaveDelay: autoSaveDelay.value }),
});

const autoSave = computed({
  get: () => props.layoutOptions?.autoSave !== false,
  set: (val) => emit('update:layoutOptions', { ...props.layoutOptions, spacing: spacing.value, autoSave: val, autoSaveDelay: autoSaveDelay.value }),
});

const autoSaveDelay = computed({
  get: () => props.layoutOptions?.autoSaveDelay || 1000,
  set: (val) => emit('update:layoutOptions', { ...props.layoutOptions, spacing: spacing.value, autoSave: autoSave.value, autoSaveDelay: val }),
});
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════
   Options Panel — BEM
   Block: .options
   ═══════════════════════════════════════════════════════ */

.options {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.options__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.options__label {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--theme--foreground-subdued, #999);
}

.options__buttons {
  display: flex;
  gap: 0;
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
}

.options__btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-right: 1px solid var(--theme--border-color, #e0e0e0);
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #333);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s;
}

.options__btn:last-child {
  border-right: none;
}

.options__btn--active {
  background: var(--theme--primary, #6644ff);
  color: var(--theme--primary-foreground, #fff);
}

.options__btn:not(.options__btn--active):hover {
  background: var(--theme--background-accent, #f0f0f0);
}

/* ── Toggle switch ── */

.options__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.options__toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.options__toggle-track {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--theme--border-color, #ccc);
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.options__toggle-input:checked + .options__toggle-track {
  background: var(--theme--primary, #6644ff);
}

.options__toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.options__toggle-input:checked + .options__toggle-track .options__toggle-thumb {
  transform: translateX(16px);
}

.options__toggle-text {
  font-size: 14px;
  color: var(--theme--foreground, #333);
}

.options__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #333);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.options__input:focus {
  border-color: var(--theme--primary, #6644ff);
}
</style>
