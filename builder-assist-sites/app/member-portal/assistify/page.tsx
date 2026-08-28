import { requireChatGPTUser } from "../../chatgpt-auth";
import { AssistifyClient } from "./assistify-client";

export const metadata = {
  title: "Assistify Digital Twin · Builder Assist",
  description: "Plan-linked construction sequencing, parcel evidence, underground inspection and source verification.",
};

export default async function AssistifyPage() {
  const user = await requireChatGPTUser("/member-portal/assistify");
  return <AssistifyClient userName={user.displayName} />;
}
