import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "@/App";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
  }),
}));

vi.mock("@/components/SupportChat", () => ({
  SupportChat: () => null,
}));

vi.mock("@/pages/Checkout", () => ({
  default: () => null,
}));

describe("App shell", () => {
  it("renders the public landing page for unauthenticated users", () => {
    render(<App />);
    expect(screen.getByTestId("text-logo")).toHaveTextContent("Kull AI");
    expect(screen.getByTestId("button-login-nav")).toBeInTheDocument();
  });
});
