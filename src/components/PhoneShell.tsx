import { ReactNode } from 'react';

/**
 * PhoneShell — mobile-first frame.
 * - On desktop (viewport ≥ 430px): renders a fixed 390×844 phone frame centered
 *   on the desk background, with rounded corners and a soft deep shadow.
 * - On mobile (< 430px): fills the screen edge-to-edge, no frame chrome.
 * The inner content is expected to be a full-height flex column (header + main + nav).
 */
export default function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background sm:bg-desk sm:grid sm:place-items-center sm:p-6">
      <div
        className="
          w-full min-h-screen bg-background overflow-hidden flex flex-col
          sm:min-h-0 sm:w-[390px] sm:h-[844px] sm:rounded-phone sm:border sm:border-border sm:shadow-phone
        "
      >
        {children}
      </div>
    </div>
  );
}
