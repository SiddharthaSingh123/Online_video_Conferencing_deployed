"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

export default function CopyLinkButton({ link, className = "" }: { link: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (await copyToClipboard(link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleClick}
      title={copied ? "Copied!" : "Copy invite link"}
      aria-label="Copy invite link"
      className={`rounded-lg border border-line p-2 text-ink hover:bg-panel ${className}`}
    >
      {copied ? <Check className="size-4 text-green-600" /> : <Link2 className="size-4" />}
    </button>
  );
}
