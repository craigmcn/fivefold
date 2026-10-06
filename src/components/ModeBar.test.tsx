import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModeBar } from "./ModeBar";

const renderBar = (props: Partial<Parameters<typeof ModeBar>[0]> = {}) => {
  const onMode = vi.fn();
  const onHardMode = vi.fn();
  render(
    <ModeBar
      mode="endless"
      hardMode={false}
      stageHard={false}
      onMode={onMode}
      onHardMode={onHardMode}
      {...props}
    />,
  );
  return { onMode, onHardMode };
};

describe("ModeBar", () => {
  it("marks the current mode and switches on click", async () => {
    const { onMode } = renderBar();
    expect(screen.getByRole("button", { name: "Endless" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Daily" }));
    expect(onMode).toHaveBeenCalledWith("daily");
  });

  it("keeps focus off the mode buttons", () => {
    renderBar();
    const daily = screen.getByRole("button", { name: "Daily" });
    expect(fireEvent.mouseDown(daily)).toBe(false);
  });

  it("toggles hard mode", async () => {
    const { onHardMode } = renderBar();
    await userEvent.click(screen.getByRole("switch", { name: "Hard mode" }));
    expect(onHardMode).toHaveBeenCalledWith(true);
  });

  it("says a hard mode change waits for the next stage", () => {
    renderBar({ hardMode: true, stageHard: false });
    expect(screen.getByText(/from your next stage/)).toBeInTheDocument();
  });

  it("says nothing extra when the stage matches the setting", () => {
    renderBar({ hardMode: true, stageHard: true });
    expect(screen.queryByText(/from your next stage/)).not.toBeInTheDocument();
  });
});
