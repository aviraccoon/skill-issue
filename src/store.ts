type Listener<T> = (state: T) => void;

export interface Store<T> {
	getState(): T;
	get<K extends keyof T>(key: K): T[K];
	set<K extends keyof T>(key: K, value: T[K]): void;
	update<K extends keyof T>(key: K, updater: (current: T[K]) => T[K]): void;
	setState(newState: T): void;
	subscribe(listener: Listener<T>): () => void;
}

/**
 * Creates a simple reactive store for state management.
 * Notifies subscribers when state changes.
 */
export function createStore<T extends object>(initialState: T): Store<T> {
	let state = { ...initialState };
	const listeners = new Set<Listener<T>>();

	/** Notify all subscribers of state change. */
	function notify() {
		for (const listener of listeners) {
			listener(state);
		}
	}

	return {
		/** Returns the full current state. */
		getState() {
			return state;
		},

		/** Returns a specific property from state. */
		get<K extends keyof T>(key: K): T[K] {
			return state[key];
		},

		/** Sets a property to a new value. Notifies if changed. */
		set<K extends keyof T>(key: K, value: T[K]) {
			if (state[key] !== value) {
				state = { ...state, [key]: value };
				notify();
			}
		},

		/** Updates a property using an updater function. Notifies if changed. */
		update<K extends keyof T>(key: K, updater: (current: T[K]) => T[K]) {
			const newValue = updater(state[key]);
			if (state[key] !== newValue) {
				state = { ...state, [key]: newValue };
				notify();
			}
		},

		/** Replaces entire state. Always notifies. */
		setState(newState: T) {
			state = { ...newState };
			notify();
		},

		/** Subscribes to state changes. Returns unsubscribe function. */
		subscribe(listener: Listener<T>) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
