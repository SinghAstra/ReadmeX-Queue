"use server";

import { Message } from "@prisma/client";
import { serialize } from "next-mdx-remote/serialize";
import { ChatMessage } from "./chat-message";

export default async function MessageWrapper({
  message,
}: {
  message: Message;
}) {
  const serializedContent = await serialize(message.text);

  console.log("serializedContent is ", serializedContent);

  return (
    <ChatMessage message={message} serializedContent={serializedContent} />
  );
}
