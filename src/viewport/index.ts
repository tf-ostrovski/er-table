import { defineLayout, useSync, useCollection, useItems, useStores } from '@directus/extensions-sdk';
import { ref, computed, watch, toRefs } from 'vue';
import { useSubscription } from './use-subscription';
import LayoutComponent from './layout.vue';
import OptionsComponent from './options.vue';
import ActionsComponent from './actions.vue';
import type { LayoutOptions, LayoutQuery } from './types';

export default defineLayout<LayoutOptions, LayoutQuery>({
  id: 'viewport',
  name: 'Viewport',
  icon: 'edit_note',
  component: LayoutComponent,
  slots: {
    options: OptionsComponent,
    actions: ActionsComponent,
    sidebar: () => null,
  },
  setup(props, { emit }) {
    const { collection, search, filter } = toRefs(props);

    const selection = useSync(props, 'selection', emit);
    const layoutOptions = useSync(props, 'layoutOptions', emit);
    const layoutQuery = useSync(props, 'layoutQuery', emit);

    const page = computed<number>({
      get: () => layoutQuery.value?.page || 1,
      set: (val) => { layoutQuery.value = { ...layoutQuery.value, page: val }; },
    });
    const limit = computed<number>({
      get: () => layoutQuery.value?.limit || 25,
      set: (val) => { layoutQuery.value = { ...layoutQuery.value, limit: val, page: 1 }; },
    });
    const sort = computed<string[]>({
      get: () => layoutQuery.value?.sort || [],
      set: (val) => { layoutQuery.value = { ...layoutQuery.value, sort: val, page: 1 }; },
    });
    const fields = computed<string[]>({
      get: () => layoutQuery.value?.fields || ['*'],
      set: (val) => { layoutQuery.value = { ...layoutQuery.value, fields: val }; },
    });

    const spacing = computed<'compact' | 'cozy' | 'comfortable'>({
      get: () => layoutOptions.value?.spacing || 'cozy',
      set: (val) => { layoutOptions.value = { ...layoutOptions.value, spacing: val }; },
    });
    const autoSave = computed<boolean>({
      get: () => layoutOptions.value?.autoSave !== false,
      set: (val) => { layoutOptions.value = { ...layoutOptions.value, autoSave: val }; },
    });
    const autoSaveDelay = computed<number>({
      get: () => layoutOptions.value?.autoSaveDelay || 1000,
      set: (val) => { layoutOptions.value = { ...layoutOptions.value, autoSaveDelay: val }; },
    });

    const { info: collectionInfo, fields: fieldsInfo, primaryKeyField } = useCollection(collection);

    const queryFields = computed(() => {
      if (!fieldsInfo.value) return ['*'];
      const visibleFields = fieldsInfo.value
        .filter((f: any) => !f.meta?.hidden && !['alias', 'o2m', 'm2m', 'm2a'].includes(f.type))
        .map((f: any) => f.field);
      return visibleFields.length > 0 ? visibleFields : ['*'];
    });

    // Set fields from collection metadata when first loaded
    watch(queryFields, (val) => {
      if (fields.value.length === 0 || (fields.value.length === 1 && fields.value[0] === '*')) {
        fields.value = val;
      }
    }, { immediate: true });

    const { items, totalPages, itemCount, totalCount, loading, getItems } = useItems(collection, {
      fields,
      limit,
      sort,
      page,
      search,
      filter,
    });

    const liveRefresh = computed<boolean>({
      get: () => layoutOptions.value?.liveRefresh !== false,
      set: (val) => { layoutOptions.value = { ...layoutOptions.value, liveRefresh: val }; },
    });

    const stores = useStores();

    const { connected: wsConnected } = useSubscription({
      collection,
      onEvent: getItems,
      enabled: liveRefresh,
      getToken: () => {
        try { return stores.useAuthStore().token; }
        catch { return null; }
      },
    });

    function toggleSort(field: string) {
      const current = sort.value;
      if (current.length > 0 && current[0] === field) {
        sort.value = [`-${field}`];
      } else if (current.length > 0 && current[0] === `-${field}`) {
        sort.value = [];
      } else {
        sort.value = [field];
      }
    }

    function selectAll() {
      if (!items.value || !primaryKeyField.value) return;
      const pk = primaryKeyField.value.field;
      const allKeys = items.value.map((item: any) => item[pk]);
      if (selection.value && selection.value.length === allKeys.length) {
        selection.value = [];
      } else {
        selection.value = allKeys;
      }
    }

    const pendingEdits = ref(new Map<string | number, Record<string, any>>());
    const savingKeys = ref(new Set<string | number>());

    return {
      collection,
      collectionInfo,
      fieldsInfo,
      primaryKeyField,
      items,
      loading,
      totalPages,
      itemCount,
      totalCount,
      page,
      limit,
      sort,
      fields,
      spacing,
      autoSave,
      autoSaveDelay,
      liveRefresh,
      wsConnected,
      selection,
      toggleSort,
      selectAll,
      refresh: getItems,
      pendingEdits,
      savingKeys,
      filter,
      search,
    };
  },
});
