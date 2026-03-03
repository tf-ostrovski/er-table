<template>
  <div class="actions">
    <span class="actions__count" v-if="itemCount !== null && totalCount !== null">
      {{ rangeStart }}-{{ rangeEnd }} of {{ totalCount }}
    </span>
    <button
      v-if="!autoSave && hasPending"
      class="actions__save-btn"
      @click="$emit('save')"
    >
      Save Changes
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  itemCount: number | null;
  totalCount: number | null;
  page: number;
  limit: number;
  autoSave: boolean;
  hasPending: boolean;
}>();

defineEmits<{
  (e: 'save'): void;
}>();

const rangeStart = computed(() => (props.page - 1) * props.limit + 1);
const rangeEnd = computed(() => {
  const end = props.page * props.limit;
  return props.totalCount !== null ? Math.min(end, props.totalCount) : end;
});
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════
   Actions Bar — BEM
   Block: .actions
   ═══════════════════════════════════════════════════════ */

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actions__count {
  font-size: 14px;
  color: var(--theme--foreground-subdued, #999);
}

.actions__save-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: var(--theme--primary, #6644ff);
  color: var(--theme--primary-foreground, #fff);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: opacity 0.15s;
}

.actions__save-btn:hover {
  opacity: 0.85;
}
</style>
