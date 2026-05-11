import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "./Composer";

describe("Composer", () => {
  const baseProps = {
    onCancel: vi.fn(),
    sending: false,
    hasActiveExecution: false,
    cancelling: false,
    disabled: false,
  };

  it("submits only once on Ctrl+Enter", () => {
    const onSend = vi.fn();

    render(<Composer {...baseProps} onSend={onSend} />);

    const input = screen.getByPlaceholderText("Send a message…");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("submits only once on Cmd+Enter", () => {
    const onSend = vi.fn();

    render(<Composer {...baseProps} onSend={onSend} />);

    const input = screen.getByPlaceholderText("Send a message…");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("hello");
  });
});
