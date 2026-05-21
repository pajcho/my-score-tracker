import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateProfileMock,
  deleteAccountMock,
  toastMock,
  useAuthMock,
  useNotificationsMock,
  usePushSubscriptionsMock,
  useNotificationPreferencesMock,
  touchSubscriptionMock,
} = vi.hoisted(() => ({
  updateProfileMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  toastMock: vi.fn(),
  useAuthMock: vi.fn(),
  useNotificationsMock: vi.fn(),
  usePushSubscriptionsMock: vi.fn(),
  useNotificationPreferencesMock: vi.fn(),
  touchSubscriptionMock: vi.fn(),
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

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => useNotificationsMock(),
}));

vi.mock("@/hooks/usePushSubscriptions", () => ({
  usePushSubscriptions: () => usePushSubscriptionsMock(),
  useTouchCurrentSubscription: (...args: unknown[]) => touchSubscriptionMock(...args),
}));

vi.mock("@/hooks/useNotificationPreferences", () => ({
  useNotificationPreferences: () => useNotificationPreferencesMock(),
}));

vi.mock("@/components/ui/alertDialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
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

// Tabs primitive only renders the active TabsContent by default. Stub
// it so both tabs render and every assertion can target a single DOM.
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { SettingsPage } from "@/components/pages/SettingsPage";

const defaultNotifications = {
  supported: true,
  permission: "default" as NotificationPermission,
  isSubscribed: false,
  subscription: null,
  pending: false,
  error: null,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  sendLocalTest: vi.fn(),
};

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      profile: { name: "Nikola", email: "nikola@example.com" },
    });
    updateProfileMock.mockResolvedValue(undefined);
    deleteAccountMock.mockResolvedValue(undefined);
    useNotificationsMock.mockReturnValue({ ...defaultNotifications });
    usePushSubscriptionsMock.mockReturnValue({
      subscriptions: [],
      isLoading: false,
      remove: vi.fn(),
      isRemoving: false,
      refresh: vi.fn(),
    });
    useNotificationPreferencesMock.mockReturnValue({
      prefs: { notify_on_live_game_invite: true },
      isLoading: false,
      save: vi.fn(),
      saving: false,
    });
  });

  it("syncs profile inputs from auth state", () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText("Full Name")).toHaveValue("Nikola");
    expect(screen.getByLabelText("Email Address")).toHaveValue("nikola@example.com");
  });

  it("saves profile and toasts on success", async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "N. P." } });
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "n@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith("N. P.", "n@example.com");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Profile updated" }),
      );
    });
  });

  it("renders the Enable notifications button when not subscribed", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /enable notifications/i })).toBeInTheDocument();
  });

  it("calls subscribe when Enable notifications is clicked", () => {
    const subscribe = vi.fn();
    useNotificationsMock.mockReturnValue({ ...defaultNotifications, subscribe });
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /enable notifications/i }));
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("shows Disable + Send local test when already subscribed", () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotifications,
      isSubscribed: true,
      subscription: { endpoint: "https://push.test/abc", keys: { p256dh: "", auth: "" } },
    });
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /disable notifications/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send local test/i })).toBeInTheDocument();
  });

  it("warns when permission is denied", () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotifications,
      permission: "denied" as NotificationPermission,
    });
    render(<SettingsPage />);
    expect(
      screen.getByText(/Notifications permission was denied/i),
    ).toBeInTheDocument();
  });

  it("disables Save until the preferences toggle changes", () => {
    render(<SettingsPage />);
    const save = screen.getAllByRole("button", { name: /^save$/i })[0];
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Live game invites from friends/i));
    expect(save).not.toBeDisabled();
  });
});
