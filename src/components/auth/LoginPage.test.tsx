import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, toastMock, signInMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  signInMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    signIn: signInMock,
  },
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (value: boolean) => void }) => (
    <button type="button" aria-label="Remember me" onClick={() => onCheckedChange(!checked)}>
      {checked ? "checked" : "unchecked"}
    </button>
  ),
}));

import { LoginPage } from "@/components/auth/LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in successfully and navigates home", async () => {
    signInMock.mockResolvedValueOnce({ error: null });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Passw0rd!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("user@example.com", "Passw0rd!");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Welcome back!",
        })
      );
      expect(navigateMock).toHaveBeenCalledWith("/");
    });
  });

  it("shows invalid credentials message", async () => {
    signInMock.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Login failed",
          variant: "destructive",
        })
      );
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows generic sign-in error message", async () => {
    signInMock.mockResolvedValueOnce({ error: { message: "Service unavailable" } });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Passw0rd!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description: "Service unavailable",
          variant: "destructive",
        })
      );
    });
  });

  it("shows fallback message when sign-in throws", async () => {
    signInMock.mockRejectedValueOnce(new Error("network"));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Passw0rd!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      );
    });
  });

  it("toggles password visibility and remember me", () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    const togglePasswordButton = passwordInput.parentElement?.querySelector("button") as HTMLButtonElement;
    fireEvent.click(togglePasswordButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    const rememberMeButton = screen.getByRole("button", { name: "Remember me" });
    expect(rememberMeButton).toHaveTextContent("unchecked");
    fireEvent.click(rememberMeButton);
    expect(rememberMeButton).toHaveTextContent("checked");
  });
});
