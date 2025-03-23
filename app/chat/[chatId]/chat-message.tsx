"use client";

import MDXSource from "@/components/mdx/mdx-source";
import { cn } from "@/lib/utils";
import { Message } from "@prisma/client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface ChatMessageProps {
  message: Message;
}

const markdownContent = `
# Welcome to My MDX Demo

This is a paragraph with **bold text** and *italic text*.

## Code Example
\`\`\`javascript
function greet() {
  return "Hello, world!";
}
\`\`\`

## Lists

### Unordered List
- Item 1
- Item 2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

## Table
| Name | Role | Department |
|------|------|------------|
| John | Developer | Engineering |
| Jane | Designer | Design |
| Bob | Manager | Administration |

## Blockquote
> This is a blockquote. It can span multiple lines and is useful for highlighting important information.

## Custom Components


<Alert type="info">
  This is an informational alert.
</Alert>


## Image
![Example image](https://example.com/image.jpg)

## Link
[Visit our website](https://example.com)
`;

export function ChatMessage({ message }: ChatMessageProps) {
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
          {isUser ? (
            <p className="m-0">{message.text}</p>
          ) : (
            <MDXSource message={markdownContent} />
          )}
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
