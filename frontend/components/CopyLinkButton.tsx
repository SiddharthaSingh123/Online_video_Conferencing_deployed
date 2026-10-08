"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

type CopyLinkButtonProps = { link: string; tone?: "light" | "dark" };

export default function CopyLinkButton({ link, tone = "light" }: CopyLinkButtonProps) {
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
      className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${
        tone === "light"
          ? "border border-line text-ink hover:bg-panel"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {copied ? <Check className="size-4 text-green-500" /> : <Link2 className="size-4" />}
    </button>
  );
}
