export default function Logo({ size = "md", className = "" }) {
  const sizes = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-2xl",
    lg: "w-16 h-16 text-3xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-black shadow-lg`}
      >
        Q
      </div>
      <div className="flex flex-col">
        <span className="font-black text-gray-900 text-xl tracking-tight">
          QuizGuard
        </span>
        <span className="text-xs text-gray-500 font-medium tracking-wide uppercase">
          Secure Testing
        </span>
      </div>
    </div>
  );
}
