export default function Footer() {
  return (
    <footer className="mt-auto py-6 text-center border-t border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-sm text-gray-600">
          © {new Date().getFullYear()} QuizGuard • Developed by{" "}
          <a
            href="https://github.com/AbdulMoiz34"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-semibold transition-colors cursor-pointer"
          >
            Abdul Moiz
          </a>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Secure Quiz Management System
        </p>
      </div>
    </footer>
  );
}
