import React from 'react';

interface SectionDividerProps {
  label?: string;
  className?: string;
}

export function SectionDivider({ label, className = '' }: SectionDividerProps) {
  if (!label) {
    return <hr className={`border-t-[0.5px] border-border-base my-6 ${className}`} />;
  }

  return (
    <div className={`relative flex py-4 items-center ${className}`}>
      <div className="flex-grow border-t-[0.5px] border-border-base"></div>
      <span className="flex-shrink mx-4 text-[10px] font-mono tracking-widest text-ink-dim uppercase bg-void px-2">
        {label}
      </span>
      <div className="flex-grow border-t-[0.5px] border-border-base"></div>
    </div>
  );
}
