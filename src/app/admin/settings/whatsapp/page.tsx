import { getSenders, getWhatsAppTemplates } from "@/app/actions/sender-actions";
import WhatsAppSendersClient from "./WhatsAppSendersClient";

export const dynamic = "force-dynamic";

export default async function WhatsAppSendersPage() {
  const [senders, templates] = await Promise.all([getSenders(), getWhatsAppTemplates()]);
  return <WhatsAppSendersClient senders={senders} templates={templates} />;
}
