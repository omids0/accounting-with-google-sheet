/**
 * Full-screen start-up splash. The `boot-*` classes are defined inline in
 * index.html so the pre-JS splash and this one are pixel-identical; React's first
 * render swaps one for the other without a visible change.
 */
export default function AppSplash() {
  return (
    <div className="boot-splash" aria-busy="true" aria-label="در حال بارگذاری">
      <svg className="boot-logo" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="22" fill="#0f766e" />
        <path d="M22 72V28M22 72h56" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="30" y="48" width="8" height="24" rx="2" fill="#fff" />
        <rect x="42" y="36" width="8" height="36" rx="2" fill="#fff" />
        <rect x="54" y="52" width="8" height="20" rx="2" fill="#fff" />
      </svg>
      <p className="boot-title">حساب کتاب</p>
      <div className="boot-dots" role="status">
        <span />
        <span />
        <span />
        <span className="sr-only">در حال بارگذاری</span>
      </div>
    </div>
  )
}
