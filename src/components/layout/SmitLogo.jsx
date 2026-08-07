export default function SmitLogo({ width = "100", height = "38", className = "" }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
      {/* Graduation cap */}
      <polygon points="48,15 68,24 48,33 28,24" fill="#1565C0"/>
      <rect x="62" y="24" width="3" height="12" fill="#1565C0"/>
      <circle cx="63.5" cy="37" r="4" fill="#1565C0"/>
      {/* Green swoosh */}
      <path d="M26,30 Q32,12 48,22" stroke="#43A047" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      {/* S M I T letters */}
      <text x="15" y="70" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="45" fill="#1565C0">SMIT</text>
      {/* Green accent on i */}
      <circle cx="118" cy="30" r="5" fill="#43A047"/>
    </svg>
  );
}