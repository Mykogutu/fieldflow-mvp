import { getSenders } from "@/app/actions/sender-actions";
import WhatsAppSendersClient from "./WhatsAppSendersClient";

export const dynamic = "force-dynamic";

export default async function WhatsAppSendersPage() {
  const senders = await getSenders();
  return <WhatsAppSendersClient senders={senders} />;
}
