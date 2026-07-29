export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  icon,
  ...props
}) {
  const variants = {
    primary:
      "bg-primary-700 hover:bg-primary-800 text-white shadow-sm hover:shadow-md disabled:bg-gray-300",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 disabled:bg-gray-100",
    danger:
      "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md disabled:bg-gray-300",
    ghost:
      "bg-transparent hover:bg-gray-100 text-gray-700 disabled:bg-transparent disabled:text-gray-400",
    link: "bg-transparent hover:bg-transparent text-primary-700 hover:text-primary-800 underline-offset-4 hover:underline disabled:text-gray-400",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  };

  return (
    <button
      className={`
        font-semibold transition-all duration-200 disabled:cursor-not-allowed
        inline-flex items-center justify-center gap-2
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="loader !w-4 !h-4" />}
      {!loading && icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
