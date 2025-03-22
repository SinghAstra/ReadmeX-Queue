"use client";

import MDXSource from "@/components/mdx/mdx-source";
import { cn } from "@/lib/utils";
import { Message } from "@prisma/client";
import { Check, Copy } from "lucide-react";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { useState } from "react";

interface ChatMessageProps {
  message: Message;
  serializedContent?: MDXRemoteSerializeResult;
}

export function ChatMessage({ message, serializedContent }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = false;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-start gap-3", isUser && "justify-end")}>
      <div
        className={cn(
          "group relative rounded-lg px-3 py-2 max-w-[65%]",
          "bg-muted text-muted-foreground"
        )}
      >
        <div className="prose prose-sm prose-invert">
          {isUser && <p className="m-0">{message.text}</p>}
          {serializedContent && <MDXSource mdxSource={serializedContent} />}
        </div>

        {!isUser && (
          <button
            onClick={copyToClipboard}
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Copy message"
          >
            {copied ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Copy size={16} className="text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
