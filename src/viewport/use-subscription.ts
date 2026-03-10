import { ref, watch, onUnmounted, type Ref } from 'vue';

interface UseSubscriptionOptions {
	collection: Ref<string>;
	onEvent: () => void;
	enabled: Ref<boolean>;
	debounceMs?: number;
	getToken: () => string | null;
}

export function useSubscription({ collection, onEvent, enabled, debounceMs = 300, getToken }: UseSubscriptionOptions) {
	const connected = ref(false);

	let ws: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	let destroyed = false;

	const MAX_RECONNECT_DELAY = 30_000;
	const BASE_RECONNECT_DELAY = 1_000;

	function getWsUrl(): string {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		return `${protocol}//${window.location.host}/websocket`;
	}

	function connect() {
		if (destroyed || !enabled.value) return;
		cleanup(false);

		ws = new WebSocket(getWsUrl());

		ws.onopen = () => {
			connected.value = true;
			reconnectAttempts = 0;
			// Don't subscribe yet — wait for auth confirmation from server
		};

		ws.onmessage = (event) => {
			let msg: any;
			try {
				msg = JSON.parse(event.data);
			} catch {
				return;
			}

			switch (msg.type) {
				case 'auth':
					if (msg.status === 'ok') {
						subscribe();
					} else if (msg.status === 'required') {
						const token = getToken();
						if (token) {
							ws?.send(JSON.stringify({ type: 'authenticate', access_token: token }));
						} else {
							ws?.close();
						}
					} else if (msg.status === 'error') {
						ws?.close();
					}
					break;

				case 'subscription':
					if (msg.event !== 'init') {
						debouncedRefresh();
					}
					break;

				case 'ping':
					ws?.send(JSON.stringify({ type: 'pong' }));
					break;
			}
		};

		ws.onclose = () => {
			connected.value = false;
			if (!destroyed && enabled.value) {
				scheduleReconnect();
			}
		};

		ws.onerror = () => {
			// onclose fires after onerror — reconnect handled there
		};
	}

	function subscribe() {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		ws.send(JSON.stringify({
			type: 'subscribe',
			collection: collection.value,
			uid: 'er-table',
			query: { fields: ['id'] },
		}));
	}

	function debouncedRefresh() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			onEvent();
		}, debounceMs);
	}

	function scheduleReconnect() {
		if (reconnectTimer) clearTimeout(reconnectTimer);
		const delay = Math.min(BASE_RECONNECT_DELAY * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
		reconnectAttempts++;
		reconnectTimer = setTimeout(() => connect(), delay);
	}

	function cleanup(resetDestroyed = true) {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (ws) {
			ws.onopen = null;
			ws.onmessage = null;
			ws.onclose = null;
			ws.onerror = null;
			if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
				ws.close();
			}
			ws = null;
		}
		connected.value = false;
		if (resetDestroyed) destroyed = false;
	}

	watch(collection, () => {
		if (connected.value && ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ type: 'unsubscribe', uid: 'er-table' }));
			subscribe();
		}
	});

	watch(enabled, (val) => {
		if (val) {
			connect();
		} else {
			cleanup();
		}
	}, { immediate: true });

	onUnmounted(() => {
		destroyed = true;
		cleanup(false);
	});

	return { connected };
}
