import { describe, expect, it, vi } from "vitest";

const createBrowserRouterMock = vi.fn();
const navigateMock = vi.fn(({ to }: { to: string }) => <div>{to}</div>);

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    createBrowserRouter: createBrowserRouterMock,
    Navigate: ({ to }: { to: string }) => navigateMock({ to }),
  };
});

vi.mock("@/components/Layout", () => ({ Layout: () => <div>Layout</div> }));
vi.mock("@/components/auth/LoginPage", () => ({ LoginPage: () => <div>LoginPage</div> }));
vi.mock("@/components/auth/RegisterPage", () => ({ RegisterPage: () => <div>RegisterPage</div> }));
vi.mock("@/components/pages/HomePage", () => ({ HomePage: () => <div>HomePage</div> }));
vi.mock("@/components/pages/HistoryPage", () => ({ HistoryPage: ({ view }: { view: string }) => <div>{`History-${view}`}</div> }));
vi.mock("@/components/pages/ProfilePage", () => ({ ProfilePage: () => <div>ProfilePage</div> }));
vi.mock("@/components/pages/StatisticsPage", () => ({ StatisticsPage: ({ view }: { view: string }) => <div>{`Statistics-${view}`}</div> }));
vi.mock("@/components/pages/FriendsPage", () => ({ FriendsPage: () => <div>FriendsPage</div> }));
vi.mock("@/components/pages/LiveScorePage", () => ({ LiveScorePage: () => <div>LiveScorePage</div> }));
vi.mock("@/components/auth/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/routerBase.ts", () => ({ getBaseName: () => "/mock-base" }));

describe("router config", () => {
  it("creates browser router with expected basename and routes", async () => {
    await import("@/routes");

    expect(createBrowserRouterMock).toHaveBeenCalledTimes(1);
    const [routes, options] = createBrowserRouterMock.mock.calls[0];
    expect(options).toEqual({ basename: "/mock-base" });
    expect(routes).toHaveLength(4);
    expect(routes[0].path).toBe("/login");
    expect(routes[1].path).toBe("/register");
    expect(routes[2].path).toBe("/");
    expect(routes[3].path).toBe("*");
  });
});
