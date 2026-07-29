import { ConfigProvider } from "antd";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import QuizAttempt from "./pages/QuizAttempt.jsx";
import StudentHome from "./pages/StudentHome.jsx";
import SubmissionDetail from "./pages/SubmissionDetail.jsx";
import ViewResult from "./pages/ViewResult.jsx";

const antTheme = {
  token: {
    colorPrimary: "#1d4ed8",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    borderRadius: 12,
    borderRadiusLG: 16,
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontSize: 14,
    colorBgContainer: "#ffffff",
  },
  components: {
    Table: { borderRadius: 16 },
    Modal: { borderRadiusLG: 24 },
    Select: { borderRadius: 12 },
    Input: { borderRadius: 12 },
  },
};

export default function App() {
  return (
    <ConfigProvider theme={antTheme}>
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/view-result" element={<ViewResult />} />
        <Route path="/quiz/:quizId" element={<QuizAttempt />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/submissions/:quizId/:submissionId"
          element={
            <ProtectedRoute>
              <SubmissionDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
}
