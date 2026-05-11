import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppPreferencesProvider } from "../../preferences/AppPreferencesProvider";
import { Sidebar } from "./Sidebar";

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", username: "duxx" },
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../../api/chats", () => ({
  updateChatTitle: vi.fn(),
  archiveChat: vi.fn(),
  unarchiveChat: vi.fn(),
}));

const chats = [
  {
    id: "chat-1",
    title: "Recent chat",
    archived: false,
    createdAt: "2026-05-09T09:00:00Z",
    updatedAt: "2026-05-09T10:00:00Z",
    lastMessagePreview: "Recent preview",
  },
  {
    id: "chat-2",
    title: "Pinned chat",
    archived: false,
    createdAt: "2026-05-09T08:00:00Z",
    updatedAt: "2026-05-09T09:30:00Z",
    lastMessagePreview: "Pinned preview",
  },
  {
    id: "chat-3",
    title: "Archived chat",
    archived: true,
    createdAt: "2026-05-09T07:00:00Z",
    updatedAt: "2026-05-09T11:00:00Z",
    lastMessagePreview: "Archived preview",
  },
];

function renderSidebar(overrides: Partial<ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <MemoryRouter>
      <AppPreferencesProvider>
        <Sidebar
          chats={chats}
          activeChatId="chat-1"
          showArchived={false}
          pinnedChatIds={[]}
          onTogglePin={vi.fn()}
          onChatsChanged={vi.fn()}
          onToggleArchived={vi.fn()}
          onNewChat={vi.fn()}
          onSelectChat={vi.fn()}
          {...overrides}
        />
      </AppPreferencesProvider>
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  it("filters recent and archived chats from the full chat list", () => {
    const { rerender } = renderSidebar();

    expect(screen.getByText("Recent chat")).toBeInTheDocument();
    expect(screen.queryByText("Archived chat")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AppPreferencesProvider>
          <Sidebar
            chats={chats}
            activeChatId="chat-1"
            showArchived
            pinnedChatIds={[]}
            onTogglePin={vi.fn()}
            onChatsChanged={vi.fn()}
            onToggleArchived={vi.fn()}
            onNewChat={vi.fn()}
            onSelectChat={vi.fn()}
          />
        </AppPreferencesProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Archived chat")).toBeInTheDocument();
    expect(screen.queryByText("Recent chat")).not.toBeInTheDocument();
  });

  it("shows rename, pin, and archive actions in the chat row menu", async () => {
    const user = userEvent.setup();

    renderSidebar();

    await user.click(
      screen.getByRole("button", { name: "Chat actions for Recent chat" })
    );

    const menu = screen.getByRole("menu", { name: "Chat actions" });
    expect(within(menu).getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Pin chat" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Archive chat" })).toBeInTheDocument();
  });

  it("closes the chat row menu when the user clicks outside of it", async () => {
    const user = userEvent.setup();

    renderSidebar();

    await user.click(
      screen.getByRole("button", { name: "Chat actions for Recent chat" })
    );
    expect(
      screen.getByRole("menu", { name: "Chat actions" })
    ).toBeInTheDocument();

    await user.click(document.body);

    expect(
      screen.queryByRole("menu", { name: "Chat actions" })
    ).not.toBeInTheDocument();
  });

  it("sorts pinned chats before unpinned chats inside the current filter", () => {
    renderSidebar({ pinnedChatIds: ["chat-2"] });

    const chatButtons = screen.getAllByTestId("chat-row");
    expect(chatButtons[0]).toHaveTextContent("Pinned chat");
    expect(chatButtons[1]).toHaveTextContent("Recent chat");
  });
});
