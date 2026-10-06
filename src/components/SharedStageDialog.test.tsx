import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SharedStageDialog } from "./SharedStageDialog";

const renderDialog = () => {
  const onAccept = vi.fn();
  const onKeep = vi.fn();
  render(
    <SharedStageDialog
      open
      stageNumber={7}
      onAccept={onAccept}
      onKeep={onKeep}
    />,
  );
  return { onAccept, onKeep };
};

describe("SharedStageDialog", () => {
  it("names the stage at risk and focuses the shared stage", () => {
    renderDialog();
    expect(
      screen.getByRole("dialog", { name: "Play a shared stage?" }),
    ).toHaveTextContent("You're partway through stage 7");
    expect(
      screen.getByRole("button", { name: "Play shared stage" }),
    ).toHaveFocus();
  });

  it("plays the shared stage", async () => {
    const { onAccept, onKeep } = renderDialog();
    await userEvent.click(
      screen.getByRole("button", { name: "Play shared stage" }),
    );
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onKeep).not.toHaveBeenCalled();
  });

  it("keeps the player's stage", async () => {
    const { onAccept, onKeep } = renderDialog();
    await userEvent.click(
      screen.getByRole("button", { name: "Keep my stage" }),
    );
    expect(onKeep).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
  });
});
