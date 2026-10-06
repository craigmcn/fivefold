import { fireEvent, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGameKeys } from "./useGameKeys";

const setup = () => {
  const keys = { onLetter: vi.fn(), onEnter: vi.fn(), onBackspace: vi.fn() };
  const hook = renderHook(() => useGameKeys(keys));
  return { ...keys, ...hook };
};

describe("useGameKeys", () => {
  it("routes letters, Enter and Backspace", () => {
    const { onLetter, onEnter, onBackspace } = setup();
    fireEvent.keyDown(window, { key: "A" });
    fireEvent.keyDown(window, { key: "Backspace" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onLetter).toHaveBeenCalledWith("a");
    expect(onBackspace).toHaveBeenCalledOnce();
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("ignores other keys and shortcuts", () => {
    const { onLetter } = setup();
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Shift" });
    fireEvent.keyDown(window, { key: "r", metaKey: true });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    expect(onLetter).not.toHaveBeenCalled();
  });

  it("leaves Enter and Space to a focused button", () => {
    const { onEnter, onLetter } = setup();
    const { getByRole } = render(<button type="button">Next</button>);
    fireEvent.keyDown(getByRole("button"), { key: "Enter" });
    fireEvent.keyDown(getByRole("button"), { key: " " });
    expect(onEnter).not.toHaveBeenCalled();
    // Typing still works with a button focused.
    fireEvent.keyDown(getByRole("button"), { key: "s" });
    expect(onLetter).toHaveBeenCalledWith("s");
  });

  it("stands aside while a dialog is open", () => {
    const { onLetter } = setup();
    render(<dialog open />);
    fireEvent.keyDown(window, { key: "a" });
    expect(onLetter).not.toHaveBeenCalled();
  });

  it("stops listening on unmount", () => {
    const { onLetter, unmount } = setup();
    unmount();
    fireEvent.keyDown(window, { key: "a" });
    expect(onLetter).not.toHaveBeenCalled();
  });
});
