import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, toastMock, signUpMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  signUpMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/supabase-auth", () => ({
  supabaseAuth: {
    signUp: signUpMock,
  },
}));

import { RegisterPage } from "@/components/auth/RegisterPage";

function fillValidRegisterForm() {
  fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Nikola" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "StrongPass1" } });
  fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "StrongPass1" } });
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers successfully and navigates home", async () => {
    signUpMock.mockResolvedValueOnce({ error: null });

    render(<RegisterPage />);
    fillValidRegisterForm();

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith("user@example.com", "StrongPass1", "Nikola");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Registration successful!",
        })
      );
      expect(navigateMock).toHaveBeenCalledWith("/");
    });
  });

  it("shows password requirement validation error", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Nikola" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "short" } });

    const form = screen.getByLabelText("Confirm Password").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Password requirements not met",
          variant: "destructive",
        })
      );
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("shows mismatched password validation error", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Nikola" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "StrongPass1" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "StrongPass2" } });

    const form = screen.getByLabelText("Confirm Password").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Passwords don't match",
          variant: "destructive",
        })
      );
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("handles known and generic sign-up API errors", async () => {
    signUpMock.mockResolvedValueOnce({ error: { message: "already registered" } });

    render(<RegisterPage />);
    fillValidRegisterForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Registration failed",
          variant: "destructive",
        })
      );
    });

    signUpMock.mockResolvedValueOnce({ error: { message: "Backend down" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description: "Backend down",
          variant: "destructive",
        })
      );
    });
  });

  it("handles thrown sign-up errors and toggles password visibility", async () => {
    signUpMock.mockRejectedValueOnce(new Error("network"));

    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    const toggleButtons = document.querySelectorAll("button[type='button']");
    fireEvent.click(toggleButtons[0] as HTMLButtonElement);
    fireEvent.click(toggleButtons[1] as HTMLButtonElement);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(confirmPasswordInput).toHaveAttribute("type", "text");

    fillValidRegisterForm();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      );
    });

    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("One number")).toBeInTheDocument();
    expect(screen.getByText("Passwords match")).toBeInTheDocument();
  });
});
