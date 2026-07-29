import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

export default function StudentNavbar() {
  const location = useLocation();
  const isViewResult = location.pathname === "/view-result";
  const isHome = location.pathname === "/";

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="cursor-pointer">
          <Logo size="sm" />
        </Link>
        
        <div className="flex items-center gap-3">
          {isHome && (
            <Link
              to="/view-result"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200 cursor-pointer"
            >
              <SafetyCertificateOutlined /> View My Result
            </Link>
          )}
          
          {isViewResult && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200 cursor-pointer"
            >
              ← Back to Home
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
