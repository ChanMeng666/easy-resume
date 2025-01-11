'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="fixed bottom-4 right-4 bg-primary-main text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary-dark transition-colors print:hidden"
    >
      Print Resume
    </button>
  );
} 