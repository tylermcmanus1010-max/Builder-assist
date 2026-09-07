export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="5" />
      <circle cx="51" cy="14" r="7" fill="#68D4FF" />
      <path d="m15 45 13-28h8l13 28H39l-2.4-5.5h-9.4L25 45H15Z" fill="currentColor" />
      <path d="M29.5 33h5l-2.5-7-2.5 7Z" fill="white" />
    </svg>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="m4 10 3.5 3.5L16 5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
