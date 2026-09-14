/**
 * Global test environment setup, loaded once before every test file.
 * jsdom doesn't implement these browser APIs, and several services touch
 * them directly (file downloads, live SSE feeds) — stub them here once
 * instead of repeating ad-hoc mocks in every test file that needs them.
 */
import { afterEach, vi } from 'vitest';

/**
 * Node 22+ ships its own global `localStorage` (inert unless the process is
 * started with --localstorage-file). Vitest's jsdom environment only copies
 * a window property onto the global object when that key doesn't already
 * exist there — so it silently skips installing jsdom's real, working
 * localStorage/sessionStorage, leaving Node's non-functional one in place.
 * A minimal spec-compliant in-memory Storage sidesteps that entirely rather
 * than depending on Node-version/flag behavior.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), writable: true, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), writable: true, configurable: true });

if (!('createObjectURL' in URL)) {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock-url'), writable: true });
}
if (!('revokeObjectURL' in URL)) {
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
}

class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onopen: ((ev: Event) => void) | null = null;
  readyState = 0;
  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
  close() {
    this.readyState = 2;
  }
}
// @ts-expect-error - test-only global polyfill, not a spec-complete EventSource
globalThis.EventSource = MockEventSource;

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
});
