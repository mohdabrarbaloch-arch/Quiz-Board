import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../lib/firebase.js";
import { fetchAdminByUid } from "../services/submissionService.js";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading"); // "loading" | "allowed" | "denied"

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { setStatus("denied"); return; }
      try {
        const admin = await fetchAdminByUid(user.uid);
        if (!admin) { await signOut(auth); setStatus("denied"); return; }
        setStatus("allowed");
      } catch {
        setStatus("denied");
      }
    });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="w-12 h-12 rounded-2xl bg-primary-700 flex items-center justify-center text-white font-black text-2xl shadow-lg">Q</div>
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <span className="loader !w-5 !h-5" />
          Verifying admin access…
        </div>
      </div>
    );
  }

  if (status === "denied") return <Navigate to="/admin/login" replace />;

  return children;
}
