import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResume } from "./useResume";

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

// happy-dom's PageTransitionEvent ignores the persisted option.
const pageShow = (persisted: boolean) =>
  Object.assign(new Event("pageshow"), { persisted });

describe("useResume", () => {
  afterEach(() => setVisibility("visible"));

  it("fires when the page becomes visible, not when it's hidden", () => {
    const onResume = vi.fn();
    renderHook(() => useResume(onResume));
    setVisibility("hidden");
    expect(onResume).not.toHaveBeenCalled();
    setVisibility("visible");
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("fires on a restore from the back/forward cache only", () => {
    const onResume = vi.fn();
    renderHook(() => useResume(onResume));
    window.dispatchEvent(pageShow(false));
    expect(onResume).not.toHaveBeenCalled();
    window.dispatchEvent(pageShow(true));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("stops listening on unmount", () => {
    const onResume = vi.fn();
    const { unmount } = renderHook(() => useResume(onResume));
    unmount();
    setVisibility("visible");
    expect(onResume).not.toHaveBeenCalled();
  });
});
