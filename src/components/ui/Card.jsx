export default function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-gray-200 shadow-sm
        ${hover ? "hover:shadow-md hover:border-primary-200 transition-all duration-200" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl ${className}`}>
      {children}
    </div>
  );
}
