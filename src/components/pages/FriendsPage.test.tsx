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
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/supabase-auth", () => ({
  supabaseAuth: {
    isAuthenticated: isAuthenticatedMock,
  },
}));

vi.mock("@/lib/supabase-friends", () => ({
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

vi.mock("@/components/ui/alert-dialog", () => ({
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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    type,
    className,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    className?: string;
    disabled?: boolean;
  }) => (
    <button type={type || "button"} onClick={onClick} className={className} {...rest}>
      {children}
    </button>
  ),
}));

import { FriendsPage } from "@/components/pages/FriendsPage";

describe("FriendsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticatedMock.mockReturnValue(true);
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

  it("sends invitation and shows success toast", async () => {
    render(<FriendsPage />);

    const emailInput = await screen.findByLabelText("Friend's Email *");
    fireEvent.change(emailInput, { target: { value: "friend@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(sendFriendInvitationMock).toHaveBeenCalledWith("friend@example.com", "");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invitation sent!",
        })
      );
    });
  });

  it("shows validation toast when email is missing", async () => {
    render(<FriendsPage />);

    const sendInvitationButton = await screen.findByRole("button", { name: "Send Invitation" });
    fireEvent.click(sendInvitationButton);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Email required",
          variant: "destructive",
        })
      );
    });
  });

  it("shows load failure toast", async () => {
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
  });

  it("shows invitation send failure message", async () => {
    sendFriendInvitationMock.mockRejectedValueOnce(new Error("Already invited"));
    render(<FriendsPage />);

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
    const emailInput = await screen.findByLabelText("Friend's Email *");
    fireEvent.change(emailInput, { target: { value: "friend@example.com" } });
    fireEvent.change(screen.getByLabelText("Personal Message (Optional)"), { target: { value: "hello there" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

    await waitFor(() => {
      expect(sendFriendInvitationMock).toHaveBeenCalledWith("friend@example.com", "hello there");
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

    const acceptButton = document.querySelector("button.bg-green-600") as HTMLButtonElement;
    fireEvent.click(acceptButton);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to accept invitation",
          description: "accept failed",
          variant: "destructive",
        })
      );
    });

    const senderNameElement = screen.getByText("Petar");
    const invitationCard = senderNameElement.closest(".shadow-card");
    const invitationButtons = invitationCard?.querySelectorAll("button") || [];
    const declineButton = invitationButtons[1] as HTMLButtonElement | undefined;
    if (declineButton) fireEvent.click(declineButton);
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

    const acceptButton = document.querySelector("button.bg-green-600") as HTMLButtonElement | null;
    if (acceptButton) fireEvent.click(acceptButton);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invitation accepted!",
        })
      );
    });

    const declineButton = document.querySelector("button[variant='outline']") as HTMLButtonElement | null;
    if (declineButton) fireEvent.click(declineButton);
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
