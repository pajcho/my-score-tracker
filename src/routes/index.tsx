import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/components/auth/LoginPage";
import { RegisterPage } from "@/components/auth/RegisterPage";
import { HomePage } from "@/components/pages/HomePage";
import { HistoryPage } from "@/components/pages/HistoryPage";
import { ProfilePage } from "@/components/pages/ProfilePage";
import { StatisticsPage } from "@/components/pages/StatisticsPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LiveScoreTracker } from "@/components/scores/LiveScoreTracker";

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
        path: "live-tracker",
        element: <ProtectedRoute><LiveScoreTracker onClose={() => window.history.back()} onScoresSaved={() => window.location.href = "/"} /></ProtectedRoute>
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);