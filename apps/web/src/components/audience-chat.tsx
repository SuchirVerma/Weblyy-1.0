"use client";
import { PhoneChat } from "./phone-chat";

function visitorId(): string {
  const fresh = () => `guest-${Math.random().toString(36).slice(2, 10)}`;
  try {
    let id = localStorage.getItem("weblyy-visitor");
    if (!id) {
      id = fresh();
      localStorage.setItem("weblyy-visitor", id);
    }
    return id;
  } catch {
    return fresh();
  }
}

/** Full-screen chat for audience phones. Each phone gets its own anonymous id so the counters count people. */
export function AudienceChat({ agentId, name, suggestions, source }: { agentId: string; name: string; suggestions: string[]; source?: string }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <PhoneChat agentId={agentId} name={name} suggestions={suggestions} from={visitorId} full source={source} />
    </div>
  );
}
