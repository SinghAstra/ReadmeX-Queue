import { parseMdx } from "@/lib/markdown";
import React from "react";

interface AIMessageProps {
  message: string;
}

const AIMessage = async ({ message }: AIMessageProps) => {
  const { content } = await parseMdx(message);
  return <div>{content}</div>;
};

export default AIMessage;
