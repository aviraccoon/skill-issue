import { describe, expect, test } from "bun:test";
import { createStore } from "./store";

interface TestState {
	count: number;
	name: string;
	items: string[];
}

function makeStore(initial?: Partial<TestState>) {
	return createStore<TestState>({
		count: 0,
		name: "test",
		items: [],
		...initial,
	});
}

describe("createStore", () => {
	test("getState returns current state", () => {
		const store = makeStore({ count: 5 });
		expect(store.getState().count).toBe(5);
	});

	test("get returns individual property", () => {
		const store = makeStore({ name: "hello" });
		expect(store.get("name")).toBe("hello");
	});

	test("set updates a property", () => {
		const store = makeStore();
		store.set("count", 42);
		expect(store.get("count")).toBe(42);
	});

	test("update applies updater function", () => {
		const store = makeStore({ count: 10 });
		store.update("count", (c) => c + 5);
		expect(store.get("count")).toBe(15);
	});

	test("setState replaces entire state", () => {
		const store = makeStore();
		store.setState({ count: 99, name: "replaced", items: ["a"] });
		expect(store.get("count")).toBe(99);
		expect(store.get("name")).toBe("replaced");
		expect(store.get("items")).toEqual(["a"]);
	});
});

describe("change detection", () => {
	test("set notifies subscribers on change", () => {
		const store = makeStore();
		let called = 0;
		store.subscribe(() => called++);
		store.set("count", 1);
		expect(called).toBe(1);
	});

	test("set does not notify when value is unchanged", () => {
		const store = makeStore({ count: 5 });
		let called = 0;
		store.subscribe(() => called++);
		store.set("count", 5);
		expect(called).toBe(0);
	});

	test("update notifies subscribers on change", () => {
		const store = makeStore({ count: 0 });
		let called = 0;
		store.subscribe(() => called++);
		store.update("count", (c) => c + 1);
		expect(called).toBe(1);
	});

	test("update does not notify when updater returns same value", () => {
		const store = makeStore({ count: 5 });
		let called = 0;
		store.subscribe(() => called++);
		store.update("count", (c) => c);
		expect(called).toBe(0);
	});

	test("setState always notifies even if values match", () => {
		const store = makeStore({ count: 0, name: "test", items: [] });
		let called = 0;
		store.subscribe(() => called++);
		store.setState({ count: 0, name: "test", items: [] });
		expect(called).toBe(1);
	});
});

describe("subscribe", () => {
	test("subscriber receives updated state", () => {
		const store = makeStore();
		const received: TestState[] = [];
		store.subscribe((state) => {
			received.push(state);
		});
		store.set("count", 7);
		expect(received.length).toBe(1);
		expect(received[0]?.count).toBe(7);
	});

	test("multiple subscribers all notified", () => {
		const store = makeStore();
		let a = 0;
		let b = 0;
		store.subscribe(() => a++);
		store.subscribe(() => b++);
		store.set("count", 1);
		expect(a).toBe(1);
		expect(b).toBe(1);
	});

	test("unsubscribe stops notifications", () => {
		const store = makeStore();
		let called = 0;
		const unsub = store.subscribe(() => called++);
		store.set("count", 1);
		expect(called).toBe(1);
		unsub();
		store.set("count", 2);
		expect(called).toBe(1);
	});

	test("unsubscribe only removes the specific listener", () => {
		const store = makeStore();
		let a = 0;
		let b = 0;
		const unsubA = store.subscribe(() => a++);
		store.subscribe(() => b++);
		unsubA();
		store.set("count", 1);
		expect(a).toBe(0);
		expect(b).toBe(1);
	});
});

describe("state immutability", () => {
	test("set creates a new state object", () => {
		const store = makeStore();
		const before = store.getState();
		store.set("count", 1);
		const after = store.getState();
		expect(before).not.toBe(after);
		expect(before.count).toBe(0);
		expect(after.count).toBe(1);
	});

	test("update creates a new state object", () => {
		const store = makeStore();
		const before = store.getState();
		store.update("count", (c) => c + 1);
		expect(store.getState()).not.toBe(before);
	});

	test("setState creates a copy", () => {
		const original = { count: 1, name: "a", items: [] as string[] };
		const store = makeStore();
		store.setState(original);
		original.count = 999;
		expect(store.get("count")).toBe(1);
	});
});
