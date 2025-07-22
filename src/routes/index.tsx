import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/components/auth/LoginPage";
import { RegisterPage } from "@/components/auth/RegisterPage";
import { HomePage } from "@/components/pages/HomePage";
import { HistoryPage } from "@/components/pages/HistoryPage";
import { ProfilePage } from "@/components/pages/ProfilePage";
import { StatisticsPage } from "@/components/pages/StatisticsPage";
import { FriendsPage } from "@/components/pages/FriendsPage";
import { LiveScorePage } from "@/components/pages/LiveScorePage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register", 
    element: <RegisterPage />
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ProtectedRoute><HomePage /></ProtectedRoute>
      },
      {
        path: "history",
        element: <ProtectedRoute><HistoryPage /></ProtectedRoute>
      },
      {
        path: "profile",
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>
      },
      {
        path: "statistics",
        element: <ProtectedRoute><StatisticsPage /></ProtectedRoute>
      },
      {
        path: "friends",
        element: <ProtectedRoute><FriendsPage /></ProtectedRoute>
      },
      {
        path: "live",
        element: <ProtectedRoute><LiveScorePage /></ProtectedRoute>
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);