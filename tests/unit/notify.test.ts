import { describe, it, expect, vi, beforeEach } from "vitest";

const error = vi.fn();
vi.mock("sonner", () => ({ toast: { error } }));

describe("notifyError", () => {
  beforeEach(() => {
    vi.resetModules();
    error.mockReset();
  });

  it("asks for the toaster once and holds the message until it is listening", async () => {
    const notify = await import("@/lib/notify");
    const listener = vi.fn();
    notify.subscribeToaster(listener);
    expect(notify.toasterRequested()).toBe(false);

    notify.notifyError("Couldn't update your bag", "Try again");
    notify.notifyError("Second");
    expect(notify.toasterRequested()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 0));
    expect(error).not.toHaveBeenCalled();

    notify.toasterMounted();
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(2));
    expect(error).toHaveBeenCalledWith("Couldn't update your bag", { description: "Try again" });
    expect(error).toHaveBeenCalledWith("Second", undefined);
  });
});
