import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HintBar } from "./HintBar";

const renderBar = (props: Partial<Parameters<typeof HintBar>[0]> = {}) => {
  const onReveal = vi.fn();
  const onEliminate = vi.fn();
  const result = render(
    <HintBar
      canReveal
      eliminateCount={3}
      revealCost="−20 pts"
      eliminateCost="−10 pts"
      onReveal={onReveal}
      onEliminate={onEliminate}
      {...props}
    />,
  );
  return { ...result, onReveal, onEliminate };
};

describe("HintBar", () => {
  it("offers both hints with their costs", async () => {
    const { onReveal, onEliminate } = renderBar();
    await userEvent.click(
      screen.getByRole("button", { name: "Reveal a letter (−20 pts)" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Rule out 3 letters (−10 pts)" }),
    );
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onEliminate).toHaveBeenCalledOnce();
  });

  it("drops a hint once it's used up", () => {
    renderBar({ canReveal: false, eliminateCount: 1, eliminateCost: "free" });
    expect(screen.queryByRole("button", { name: /Reveal/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Rule out 1 letter (free)" }),
    ).toBeInTheDocument();
  });

  it("renders nothing once both are used up", () => {
    const { container } = renderBar({ canReveal: false, eliminateCount: 0 });
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps focus off the hint buttons", () => {
    renderBar();
    for (const button of screen.getAllByRole("button")) {
      expect(fireEvent.mouseDown(button)).toBe(false);
    }
  });
});
