// Abstract geometric section divider — inspired by the visual logic of Adinkra
// (interlocking forms, bilateral symmetry, repetition) without reproducing any specific symbol.
export default function Divider({ className = '', light = false }) {
  return (
    <div
      className={`flex items-center justify-center py-10 ${className}`}
      aria-hidden="true"
    >
      <svg
        width="160"
        height="28"
        viewBox="0 0 160 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={light ? 'text-white/30' : 'text-muted/30'}
      >
        {/* Left horizontal rule */}
        <line x1="0" y1="14" x2="56" y2="14" stroke="currentColor" strokeWidth="1" />

        {/* Outer diamond */}
        <path
          d="M80 2 L94 14 L80 26 L66 14 Z"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />

        {/* Inner diamond */}
        <path
          d="M80 7 L91 14 L80 21 L69 14 Z"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          strokeOpacity="0.5"
        />

        {/* Centre dot */}
        <circle cx="80" cy="14" r="2" fill="currentColor" fillOpacity="0.5" />

        {/* Right horizontal rule */}
        <line x1="104" y1="14" x2="160" y2="14" stroke="currentColor" strokeWidth="1" />

        {/* Left accent dots */}
        <circle cx="46" cy="14" r="1.5" fill="currentColor" fillOpacity="0.4" />
        <circle cx="38" cy="14" r="1" fill="currentColor" fillOpacity="0.25" />

        {/* Right accent dots */}
        <circle cx="114" cy="14" r="1.5" fill="currentColor" fillOpacity="0.4" />
        <circle cx="122" cy="14" r="1" fill="currentColor" fillOpacity="0.25" />
      </svg>
    </div>
  );
}
