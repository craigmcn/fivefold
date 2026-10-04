import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AchievementToast } from "./AchievementToast";

describe("AchievementToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("names every new badge and dismisses after a few seconds", () => {
    const onDone = vi.fn();
    render(
      <AchievementToast ids={["first-try", "clean-stage"]} onDone={onDone} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Achievement unlocked: First try, Spotless",
    );
    vi.advanceTimersByTime(3999);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("restarts only when more badges arrive, not on a re-render", () => {
    const onDone = vi.fn();
    const { rerender } = render(
      <AchievementToast ids={["first-try"]} onDone={onDone} />,
    );
    vi.advanceTimersByTime(3000);
    rerender(<AchievementToast ids={["first-try"]} onDone={onDone} />);
    vi.advanceTimersByTime(1000);
    expect(onDone).toHaveBeenCalledOnce();

    onDone.mockClear();
    rerender(<AchievementToast ids={[]} onDone={onDone} />);
    rerender(<AchievementToast ids={["first-try"]} onDone={onDone} />);
    vi.advanceTimersByTime(3000);
    rerender(
      <AchievementToast ids={["first-try", "clean-stage"]} onDone={onDone} />,
    );
    vi.advanceTimersByTime(3000);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("stays silent and sets no timer with nothing to show", () => {
    const onDone = vi.fn();
    render(<AchievementToast ids={[]} onDone={onDone} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    vi.advanceTimersByTime(10_000);
    expect(onDone).not.toHaveBeenCalled();
  });
});
