import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Form, Input } from "antd";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";

export default function AdminLogin() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged?.((user) => {
      if (user) navigate("/admin", { replace: true });
    });
    return unsub;
  }, [navigate]);

  async function handleLogin(values) {
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      navigate("/admin", { replace: true });
    } catch (err) {
      const msgs = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment.",
      };
      setError(msgs[err.code] || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (branding) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.03] rounded-full" />

        <div className="relative z-10 text-center">
          {/* Logo mark */}
          <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-white font-black text-4xl">Q</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3 leading-tight">
            QuizGuard
          </h1>
          <p className="text-white/70 text-base max-w-xs mx-auto leading-relaxed">
            Secure quiz management platform for educators
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-3 text-left">
            {[
              "Create and manage quizzes",
              "Track student submissions",
              "Automatic anti-cheat detection",
              "Export results to CSV",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-white/80 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Footer credit */}
        <p className="absolute bottom-6 text-white/40 text-xs">
          © {new Date().getFullYear()} Developed by{" "}
          <a
            href="https://github.com/AbdulMoiz34"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors font-semibold"
          >
            Abdul Moiz
          </a>
        </p>
      </div>

      {/* ── Right panel (form) ───────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo (only on small screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-black text-xl">Q</span>
            </div>
            <div>
              <p className="font-black text-gray-900 leading-none">QuizGuard</p>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to access the admin panel</p>
          </div>

          {/* Error alert */}
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              className="mb-5 rounded-xl"
              closable
              onClose={() => setError("")}
            />
          )}

          {/* Form */}
          <Form form={form} layout="vertical" onFinish={handleLogin}>
            <Form.Item
              label={<span className="text-sm font-semibold text-gray-700">Email address</span>}
              name="email"
              rules={[
                { required: true, message: "Enter your email" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="admin@yourschool.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-sm font-semibold text-gray-700">Password</span>}
              name="password"
              rules={[{ required: true, message: "Enter your password" }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-3.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="loader !w-5 !h-5 !border-white/30 !border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  <LockOutlined />
                  Sign In
                </>
              )}
            </button>
          </Form>

          {/* Mobile footer credit */}
          <p className="lg:hidden text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} Developed by{" "}
            <a
              href="https://github.com/AbdulMoiz34"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Abdul Moiz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
