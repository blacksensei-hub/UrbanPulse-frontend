export default function BottomActionBar({ children, className = '' }) {
  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-border px-4 pt-3 flex items-center gap-3 ${className}`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {children}
    </div>
  );
}
