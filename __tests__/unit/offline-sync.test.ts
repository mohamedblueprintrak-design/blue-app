class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

const mockLocalStorage = new LocalStorageMock();
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

const mockDispatch = () => {};
Object.defineProperty(global, 'window', {
  value: {
    dispatchEvent: mockDispatch,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  writable: true
});

Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true
});

// Mock global fetch
const mockFetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ id: "synced-123" }),
});
global.fetch = mockFetch as any;

import {
  queueOfflineAction,
  getQueuedActions,
  removeQueuedAction,
  isOfflineClient,
  toggleOfflineOverride,
  syncAllPending,
} from "@/lib/offline-sync";

describe("Offline Sync Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.removeItem("blueprint_offline_override");
  });

  test("should check default offline state", () => {
    expect(isOfflineClient()).toBe(false);
  });

  test("should allow offline override", () => {
    toggleOfflineOverride("offline");
    expect(isOfflineClient()).toBe(true);

    toggleOfflineOverride("online");
    expect(isOfflineClient()).toBe(false);

    toggleOfflineOverride("none");
    expect(isOfflineClient()).toBe(false);
  });

  test("should queue offline action and retrieve it", () => {
    const data = { projectId: "proj-123", workDescription: "Poured concrete" };
    const action = queueOfflineAction("create-site-diary", data);

    expect(action.id).toBeDefined();
    expect(action.type).toBe("create-site-diary");
    expect(action.data).toEqual(data);

    const queued = getQueuedActions();
    expect(queued.length).toBe(1);
    expect(queued[0].data).toEqual(data);
  });

  test("should remove queued action by id", () => {
    const action1 = queueOfflineAction("create-site-diary", { text: "1" });
    const action2 = queueOfflineAction("create-site-diary", { text: "2" });

    expect(getQueuedActions().length).toBe(2);

    removeQueuedAction(action1.id);
    const queued = getQueuedActions();
    expect(queued.length).toBe(1);
    expect(queued[0].id).toBe(action2.id);
  });

  test("should sync queued action when online", async () => {
    queueOfflineAction("create-site-diary", { projectId: "1" });
    
    // Override to online
    toggleOfflineOverride("online");

    const result = await syncAllPending();
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(getQueuedActions().length).toBe(0);
  });
});
