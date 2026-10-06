import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory Sanity: documents by id, revisions, and 409s where Sanity gives them.
const db = new Map<string, Record<string, unknown>>();
let rev = 0;
let beforeWrite: (() => void) | null = null;

function conflict() {
  return Object.assign(new Error("conflict"), { statusCode: 409 });
}

const fakeClient = {
  getDocument: async (id: string) => {
    const doc = db.get(id);
    return doc ? structuredClone(doc) : undefined;
  },
  create: async (doc: Record<string, unknown>) => {
    beforeWrite?.();
    if (db.has(doc._id as string)) throw conflict();
    db.set(doc._id as string, { ...doc, _rev: `r${++rev}` });
  },
  createIfNotExists: async (doc: Record<string, unknown>) => {
    if (!db.has(doc._id as string)) db.set(doc._id as string, { ...doc, _rev: `r${++rev}` });
  },
  patch: (id: string) => {
    let ifRev: string | null = null;
    const ops: ((d: Record<string, unknown>) => void)[] = [];
    const p = {
      ifRevisionId: (r: string) => ((ifRev = r), p),
      setIfMissing: (v: Record<string, unknown>) => {
        ops.push((d) => {
          for (const [k, val] of Object.entries(v)) if (!k.includes("[") && d[k] === undefined) d[k] = val;
        });
        return p;
      },
      append: (key: string, items: unknown[]) => {
        ops.push((d) => (d[key] = [...((d[key] as unknown[]) ?? []), ...items]));
        return p;
      },
      inc: (v: Record<string, number>) => {
        ops.push((d) => {
          for (const [path, n] of Object.entries(v)) {
            const key = /_key=="([^"]+)"/.exec(path)![1];
            const rec = (d.downloads as { _key: string; claims?: number }[]).find((x) => x._key === key)!;
            rec.claims = (rec.claims ?? 0) + n;
          }
        });
        return p;
      },
      unset: (paths: string[]) => {
        ops.push((d) => {
          for (const path of paths) {
            const key = /_key=="([^"]+)"/.exec(path)![1];
            d.downloads = (d.downloads as { _key: string }[]).filter((x) => x._key !== key);
          }
        });
        return p;
      },
      commit: async () => {
        beforeWrite?.();
        const doc = db.get(id);
        if (!doc || (ifRev && doc._rev !== ifRev)) throw conflict();
        ops.forEach((op) => op(doc));
        doc._rev = `r${++rev}`;
      },
    };
    return p;
  },
};

vi.mock("@/sanity/lib/write-client", () => ({ writeClient: fakeClient }));

const store = await import("@/lib/subscriber-store");

function downloadsOf(email: string) {
  return (db.get(store.docIdForEmail(email))?.downloads as { _key: string; claims?: number }[]) ?? [];
}

beforeEach(() => {
  db.clear();
  beforeWrite = null;
});

describe("claimDownloadSlot", () => {
  it("records three downloads, then refuses the fourth", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await store.claimDownloadSlot("a@b.com", `art-${i}`, "test")).ok).toBe(true);
    }
    expect(await store.claimDownloadSlot("a@b.com", "art-3", "test")).toEqual({ ok: false, reason: "limit" });
    expect(downloadsOf("a@b.com")).toHaveLength(3);
  });

  it("re-checks the limit when another request wrote in between", async () => {
    await store.claimDownloadSlot("a@b.com", "art-0", "test");
    await store.claimDownloadSlot("a@b.com", "art-1", "test");
    // A parallel request takes the third slot between our read and our write.
    let raced = false;
    beforeWrite = () => {
      if (raced) return;
      raced = true;
      const doc = db.get(store.docIdForEmail("a@b.com"))!;
      (doc.downloads as unknown[]).push({ _key: "other", artId: "x", requestedAt: new Date().toISOString() });
      doc._rev = "raced";
    };
    expect(await store.claimDownloadSlot("a@b.com", "art-2", "test")).toEqual({ ok: false, reason: "limit" });
    expect(downloadsOf("a@b.com")).toHaveLength(3);
  });

  it("shares one limit across +tags and Gmail dots", async () => {
    await store.claimDownloadSlot("me@gmail.com", "a", "test");
    await store.claimDownloadSlot("m.e+1@gmail.com", "b", "test");
    await store.claimDownloadSlot("me+2@googlemail.com", "c", "test");
    expect((await store.claimDownloadSlot("M.E@gmail.com", "d", "test")).ok).toBe(false);
  });

  it("flags only a brand new address as a new subscriber", async () => {
    const first = await store.claimDownloadSlot("a@b.com", "a", "test");
    const second = await store.claimDownloadSlot("a@b.com", "b", "test");
    expect(first).toMatchObject({ ok: true, isNewSubscriber: true });
    expect(second).toMatchObject({ ok: true, isNewSubscriber: false });
  });
});

describe("releaseDownloadSlot", () => {
  it("gives the slot back", async () => {
    const slot = await store.claimDownloadSlot("a@b.com", "a", "test");
    if (!slot.ok) throw new Error("expected a slot");
    await store.releaseDownloadSlot("a@b.com", slot.key);
    expect(downloadsOf("a@b.com")).toHaveLength(0);
  });
});

describe("recordLinkUse", () => {
  it("allows a link MAX_CLAIMS_PER_LINK times", async () => {
    const slot = await store.claimDownloadSlot("a@b.com", "a", "test");
    if (!slot.ok) throw new Error("expected a slot");
    for (let i = 0; i < store.MAX_CLAIMS_PER_LINK; i++) {
      expect(await store.recordLinkUse("a@b.com", slot.key)).toBe(true);
    }
    expect(await store.recordLinkUse("a@b.com", slot.key)).toBe(false);
  });

  it("lets through a link whose record is unknown", async () => {
    expect(await store.recordLinkUse("a@b.com", "0000-legacy")).toBe(true);
  });

  it("refuses a key that could break out of the patch path", async () => {
    expect(await store.recordLinkUse("a@b.com", 'x"]')).toBe(false);
  });
});
