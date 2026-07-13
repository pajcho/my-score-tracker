import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  toastMock,
  getFriendsMock,
  getSentInvitationsMock,
  getReceivedInvitationsMock,
  sendFriendInvitationMock,
  acceptInvitationMock,
  declineInvitationMock,
  removeFriendMock,
  isAuthenticatedMock,
  getCurrentUserMock,
  getCurrentProfileMock,
  navigateMock,
  scoresDataMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  getFriendsMock: vi.fn(),
  getSentInvitationsMock: vi.fn(),
  getReceivedInvitationsMock: vi.fn(),
  sendFriendInvitationMock: vi.fn(),
  acceptInvitationMock: vi.fn(),
  declineInvitationMock: vi.fn(),
  removeFriendMock: vi.fn(),
  isAuthenticatedMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getCurrentProfileMock: vi.fn(),
  navigateMock: vi.fn(),
  scoresDataMock: { current: [] as Array<Record<string, unknown>> },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    isAuthenticated: isAuthenticatedMock,
    getCurrentUser: getCurrentUserMock,
    getCurrentProfile: getCurrentProfileMock,
  },
}));

vi.mock("@/components/auth/authContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: "user-1" },
    profile: { name: "Nikola", email: "user@example.com" },
  }),
}));

vi.mock("@/hooks/useTrackerData", () => ({
  useScoresQuery: () => ({ data: scoresDataMock.current }),
}));

vi.mock("@/hooks/useGravatar", () => ({
  useGravatarUrl: () => "",
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/supabaseFriends", () => ({
  supabaseFriends: {
    getFriends: getFriendsMock,
    getSentInvitations: getSentInvitationsMock,
    getReceivedInvitations: getReceivedInvitationsMock,
    sendFriendInvitation: sendFriendInvitationMock,
    acceptInvitation: acceptInvitationMock,
    declineInvitation: declineInvitationMock,
    removeFriend: removeFriendMock,
  },
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/alertDialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/responsiveFormModal", () => ({
  ResponsiveFormModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

import { FriendsPage } from "@/components/pages/FriendsPage";

async function openInviteSheet() {
  const inviteButton = await screen.findByRole("button", { name: /Invite/ });
  fireEvent.click(inviteButton);
}

describe("FriendsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scoresDataMock.current = [];
    isAuthenticatedMock.mockReturnValue(true);
    getCurrentUserMock.mockReturnValue({
      id: "user-1",
      email: "user@example.com",
    });
    getCurrentProfileMock.mockReturnValue({
      email: "user@example.com",
    });
    getFriendsMock.mockResolvedValue([
      {
        friend_id: "friend-1",
        friend_name: "Ana",
        friend_email: "ana@example.com",
        friendship_created_at: "2026-02-10T00:00:00.000Z",
      },
    ]);
    getSentInvitationsMock.mockResolvedValue([]);
    getReceivedInvitationsMock.mockResolvedValue([
      {
        id: "inv-1",
        sender_name: "Petar",
        sender_id: "friend-2",
        receiver_email: "user@example.com",
        status: "pending",
        created_at: "2026-02-10T00:00:00.000Z",
        updated_at: "2026-02-10T00:00:00.000Z",
      },
    ]);
    sendFriendInvitationMock.mockResolvedValue(undefined);
    acceptInvitationMock.mockResolvedValue(undefined);
    declineInvitationMock.mockResolvedValue(undefined);
    removeFriendMock.mockResolvedValue(undefined);
  });

  it("loads and renders friends data", async () => {
    render(<FriendsPage />);
    await waitFor(() => {
      expect(getFriendsMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Ana")).toBeInTheDocument();
      expect(screen.getByText("Petar")).toBeInTheDocument();
    });
  });

  it("shows a head-to-head record on the friend row", async () => {
    scoresDataMock.current = [
      { user_id: "user-1", opponent_user_id: "friend-1", score: "5-1" },
      { user_id: "friend-1", opponent_user_id: "user-1", score: "5-3" },
    ];
    render(<FriendsPage />);

    await screen.findByText("Ana");
    expect(screen.getByText(/2 games/)).toBeInTheDocument();
    expect(screen.getByText("1W")).toBeInTheDocument();
    expect(screen.getByText("1L")).toBeInTheDocument();
  });

  it("navigates to head-to-head statistics when a friend row is tapped", async () => {
    render(<FriendsPage />);

    const row = await screen.findByRole("button", { name: "Head-to-head statistics vs Ana" });
    fireEvent.click(row);

    expect(navigateMock).toHaveBeenCalledWith("/statistics/score?opponent=Ana");
  });

  it("sends invitation and shows success toast", async () => {
    render(<FriendsPage />);
    await openInviteSheet();

    const emailInput = await screen.findByLabelText("Friend's Email *");
    fireEvent.change(emailInput, { target: { value: "friend@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(sendFriendInvitationMock).toHaveBeenCalledWith("friend@example.com", "", "user-1", "user@example.com");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invitation sent!",
        })
      );
    });
  });

  it("shows load failure toast", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getFriendsMock.mockRejectedValueOnce(new Error("load failed"));
    render(<FriendsPage />);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to load friends",
          variant: "destructive",
        })
      );
    });
    errorSpy.mockRestore();
  });

  it("shows invitation send failure message", async () => {
    sendFriendInvitationMock.mockRejectedValueOnce(new Error("Already invited"));
    render(<FriendsPage />);
    await openInviteSheet();

    const emailInput = await screen.findByLabelText("Friend's Email *");
    fireEvent.change(emailInput, { target: { value: "friend@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to send invitation",
          description: "Already invited",
          variant: "destructive",
        })
      );
    });
  });

  it("uses fallback error message for non-Error failures", async () => {
    sendFriendInvitationMock.mockRejectedValueOnce("unexpected");
    render(<FriendsPage />);
    await openInviteSheet();

    const emailInput = await screen.findByLabelText("Friend's Email *");
    fireEvent.change(emailInput, { target: { value: "friend@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to send invitation",
          description: "Please try again",
          variant: "destructive",
        })
      );
    });
  });

  it("sends invitation with personal message", async () => {
    render(<FriendsPage />);
    await openInviteSheet();

    const emailInput = await screen.findByLabelText("Friend's Email *");
    fireEvent.change(emailInput, { target: { value: "friend@example.com" } });
    fireEvent.change(screen.getByLabelText("Personal Message (Optional)"), { target: { value: "hello there" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(sendFriendInvitationMock).toHaveBeenCalledWith(
        "friend@example.com",
        "hello there",
        "user-1",
        "user@example.com"
      );
    });
  });

  it("renders sent invitation entries and statuses", async () => {
    getSentInvitationsMock.mockResolvedValueOnce([
      {
        id: "sent-1",
        sender_id: "user-1",
        receiver_email: "accepted@example.com",
        status: "accepted",
        created_at: "2026-02-10T00:00:00.000Z",
        updated_at: "2026-02-10T00:00:00.000Z",
      },
      {
        id: "sent-2",
        sender_id: "user-1",
        receiver_email: "declined@example.com",
        status: "declined",
        created_at: "2026-02-10T00:00:00.000Z",
        updated_at: "2026-02-10T00:00:00.000Z",
      },
    ]);
    render(<FriendsPage />);

    await waitFor(() => {
      expect(screen.getByText("accepted@example.com")).toBeInTheDocument();
      expect(screen.getByText("declined@example.com")).toBeInTheDocument();
      expect(screen.getByText("accepted")).toBeInTheDocument();
      expect(screen.getByText("declined")).toBeInTheDocument();
    });
  });

  it("handles accept, decline and remove friend failures", async () => {
    acceptInvitationMock.mockRejectedValueOnce(new Error("accept failed"));
    declineInvitationMock.mockRejectedValueOnce(new Error("decline failed"));
    removeFriendMock.mockRejectedValueOnce(new Error("remove failed"));
    render(<FriendsPage />);

    await screen.findByText("Petar");

    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to accept invitation",
          description: "accept failed",
          variant: "destructive",
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Decline invitation" }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to decline invitation",
          description: "decline failed",
          variant: "destructive",
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to remove friend",
          description: "remove failed",
          variant: "destructive",
        })
      );
    });
  });

  it("handles accept, decline and remove friend success flows", async () => {
    render(<FriendsPage />);
    await screen.findByText("Petar");

    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invitation accepted!",
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Decline invitation" }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invitation declined",
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Friend removed",
        })
      );
    });
  });
});
