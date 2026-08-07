export default function CodeSnippet({ code, className = "" }) {
  if (!code) return null;

  return (
    <pre className={`bg-gray-900/90 text-emerald-400 border border-gray-700/80 rounded-2xl p-4 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap select-text ${className}`}>
      <code>{code}</code>
    </pre>
  );
}