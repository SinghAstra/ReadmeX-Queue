"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth-options";
import { prisma } from "../prisma";

export async function getChats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const chats = await prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return chats;
}
