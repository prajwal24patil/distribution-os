"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      className="h-8 rounded border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
      onClick={copyValue}
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
