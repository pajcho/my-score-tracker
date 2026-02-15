import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateProfileMock, deleteAccountMock, toastMock, useAuthMock } = vi.hoisted(() => ({
  updateProfileMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  toastMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("@/components/auth/authContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/supabaseDatabase", () => ({
  supabaseDb: {
    updateProfile: updateProfileMock,
    deleteAccount: deleteAccountMock,
  },
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
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

import { ProfilePage } from "@/components/pages/ProfilePage";

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useAuthMock.mockReturnValue({
      profile: {
        name: "Nikola",
        email: "nikola@example.com",
      },
    });
    updateProfileMock.mockResolvedValue(undefined);
    deleteAccountMock.mockResolvedValue(undefined);
  });

  it("syncs local name and email when auth profile changes", async () => {
    const { rerender } = render(<ProfilePage />);
    expect(screen.getByLabelText("Full Name")).toHaveValue("Nikola");
    expect(screen.getByLabelText("Email Address")).toHaveValue("nikola@example.com");

    useAuthMock.mockReturnValue({
      profile: {
        name: "Updated User",
        email: "updated@example.com",
      },
    });
    rerender(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Full Name")).toHaveValue("Updated User");
      expect(screen.getByLabelText("Email Address")).toHaveValue("updated@example.com");
    });
  });

  it("updates profile and shows success toast", async () => {
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Nikola P." } });
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "new@example.com" } });
    fireEvent.submit(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith("Nikola P.", "new@example.com");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Profile updated",
        })
      );
    });
  });

  it("validates password confirmation mismatch", () => {
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "currentpass" } });
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "newpassword" } });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "different" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Change Password" })[0]);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Passwords don't match",
      })
    );
  });

  it("validates minimum password length", () => {
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "currentpass" } });
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "short" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Change Password" })[0]);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Password too short",
      })
    );
  });

  it("changes password successfully", async () => {
    vi.useFakeTimers();
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "currentpass" } });
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "newpassword" } });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "newpassword" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Change Password" })[0]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Password changed",
      })
    );
  });

  it("shows update profile failure toast", async () => {
    updateProfileMock.mockRejectedValueOnce(new Error("failed"));
    render(<ProfilePage />);
    fireEvent.submit(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Update failed",
          variant: "destructive",
        })
      );
    });
  });

  it("deletes account and shows confirmation toast", async () => {
    render(<ProfilePage />);

    const deleteAccountButtons = screen.getAllByRole("button", { name: "Delete Account" });
    fireEvent.click(deleteAccountButtons[0]);
    fireEvent.click(deleteAccountButtons[1]);

    await waitFor(() => {
      expect(deleteAccountMock).toHaveBeenCalledTimes(1);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Account deleted",
        })
      );
    });
  });

  it("shows delete account failure toast", async () => {
    deleteAccountMock.mockRejectedValueOnce(new Error("failed"));
    render(<ProfilePage />);

    const deleteAccountButtons = screen.getAllByRole("button", { name: "Delete Account" });
    fireEvent.click(deleteAccountButtons[0]);
    fireEvent.click(deleteAccountButtons[1]);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Deletion failed",
          variant: "destructive",
        })
      );
    });
  });
});
