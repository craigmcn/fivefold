import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StageHeading } from "./StageHeading";

describe("StageHeading", () => {
  it("shows the stage, word and score", () => {
    render(<StageHeading label="Stage 3" cursor={1} hard={false} score={90} />);
    expect(screen.getByText("Stage 3 · Word 2 of 10")).toBeInTheDocument();
    expect(screen.getByText("90 pts")).toBeInTheDocument();
    expect(screen.queryByText(/Boss/)).not.toBeInTheDocument();
    expect(screen.queryByText("Hard")).not.toBeInTheDocument();
  });

  it("badges boss words and hard stages", () => {
    const { rerender } = render(
      <StageHeading label="Daily #4" cursor={4} hard score={0} />,
    );
    expect(screen.getByText("Boss ×2")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();

    rerender(<StageHeading label="Daily #4" cursor={9} hard score={0} />);
    expect(screen.getByText("Boss ×3")).toBeInTheDocument();
  });
});
