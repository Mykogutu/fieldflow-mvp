import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AICopilotClient from "./AICopilotClient";

export default async function AIPage() {
  const session = await getSession();
  let userName = "Admin";
  if (session?.userId) {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    if (user?.name) userName = user.name.split(" ")[0]; // First name only
  }
  return <AICopilotClient userName={userName} />;
}
