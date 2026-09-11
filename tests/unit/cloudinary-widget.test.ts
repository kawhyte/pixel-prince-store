/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  CLOUDINARY_WIDGET_SRC,
  loadCloudinaryWidget,
  resetCloudinaryWidgetLoader,
} from "@/lib/cloudinary-widget";

const widget = { createUploadWidget: vi.fn(), openUploadWidget: vi.fn() };
const tags = () => document.querySelectorAll(`script[src="${CLOUDINARY_WIDGET_SRC}"]`);
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetCloudinaryWidgetLoader();
  document.head.innerHTML = "";
  delete (window as { cloudinary?: unknown }).cloudinary;
});

describe("loadCloudinaryWidget", () => {
  it("adds the script only when asked, and resolves once it loads", async () => {
    expect(tags()).toHaveLength(0); // nothing until someone clicks

    const promise = loadCloudinaryWidget();
    expect(tags()).toHaveLength(1);
    expect(tags()[0].getAttribute("src")).toBe(CLOUDINARY_WIDGET_SRC);

    (window as { cloudinary?: unknown }).cloudinary = widget;
    tags()[0].dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBe(widget);
  });

  it("adds one script however many times it is called", async () => {
    const a = loadCloudinaryWidget();
    const b = loadCloudinaryWidget();
    expect(tags()).toHaveLength(1);

    (window as { cloudinary?: unknown }).cloudinary = widget;
    tags()[0].dispatchEvent(new Event("load"));
    expect(await a).toBe(widget);
    expect(await b).toBe(widget);

    // Already loaded: no further work, no further tag.
    await expect(loadCloudinaryWidget()).resolves.toBe(widget);
    expect(tags()).toHaveLength(1);
  });

  it("lets a later click retry after the network fails", async () => {
    const first = loadCloudinaryWidget();
    tags()[0].dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow(/Could not reach Cloudinary/);
    await settle();

    // The failure is not cached: clicking again tries again.
    document.head.innerHTML = "";
    const second = loadCloudinaryWidget();
    expect(tags()).toHaveLength(1);
    (window as { cloudinary?: unknown }).cloudinary = widget;
    tags()[0].dispatchEvent(new Event("load"));
    await expect(second).resolves.toBe(widget);
  });

  it("fails rather than hangs when the script loads without defining the widget", async () => {
    const promise = loadCloudinaryWidget();
    tags()[0].dispatchEvent(new Event("load")); // no window.cloudinary
    await expect(promise).rejects.toThrow(/Could not reach Cloudinary/);
  });
});
