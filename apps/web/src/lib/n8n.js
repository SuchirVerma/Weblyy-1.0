/** An importable n8n workflow: Twilio WhatsApp webhook -> Weblyy agent -> reply, with an escalation branch. */
export function n8nWorkflow(opts) {
  const { businessName, workflow, agentId, appUrl } = opts;
  const endpoint = `${appUrl.replace(/\/$/, "")}/api/agent`;
  return {
    name: `${businessName}: ${workflow.name} (Weblyy)`,
    nodes: [
      {
        id: "a1",
        name: "WhatsApp message in",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [0, 0],
        webhookId: `weblyy-${agentId}`,
        parameters: { httpMethod: "POST", path: `weblyy-${agentId}`, responseMode: "responseNode" },
      },
      {
        id: "a2",
        name: "Ask Weblyy agent",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [260, 0],
        parameters: {
          method: "POST",
          url: endpoint,
          sendBody: true,
          specifyBody: "json",
          jsonBody: `={{ JSON.stringify({ agentId: "${agentId}", message: $json.body.Body, from: $json.body.From }) }}`,
          options: {},
        },
      },
      {
        id: "a3",
        name: "Needs a human?",
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position: [520, 0],
        parameters: {
          conditions: {
            options: { caseSensitive: true, typeValidation: "loose" },
            combinator: "and",
            conditions: [
              { id: "c1", leftValue: "={{ $json.escalate }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } },
            ],
          },
        },
      },
      {
        id: "a4",
        name: "Alert owner",
        type: "n8n-nodes-base.twilio",
        typeVersion: 1,
        position: [780, -140],
        parameters: {
          from: "={{ $env.TWILIO_WHATSAPP_FROM }}",
          to: "={{ $env.OWNER_WHATSAPP }}",
          toWhatsapp: true,
          message: `=Weblyy alert (${workflow.name}): {{ $('WhatsApp message in').item.json.body.From }} said "{{ $('WhatsApp message in').item.json.body.Body }}"`,
        },
      },
      {
        id: "a5",
        name: "Reply to customer",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.1,
        position: [1040, 0],
        parameters: {
          respondWith: "text",
          responseBody: '=<?xml version="1.0" encoding="UTF-8"?><Response><Message>{{ $(\'Ask Weblyy agent\').item.json.reply }}</Message></Response>',
          options: { responseHeaders: { entries: [{ name: "Content-Type", value: "text/xml" }] } },
        },
      },
    ],
    connections: {
      "WhatsApp message in": { main: [[{ node: "Ask Weblyy agent", type: "main", index: 0 }]] },
      "Ask Weblyy agent": { main: [[{ node: "Needs a human?", type: "main", index: 0 }]] },
      "Needs a human?": {
        main: [[{ node: "Alert owner", type: "main", index: 0 }], [{ node: "Reply to customer", type: "main", index: 0 }]],
      },
      "Alert owner": { main: [[{ node: "Reply to customer", type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
  };
}
export function systemPromptFor(businessName, w) {
  return `You are the WhatsApp assistant for ${businessName}, handling "${w.name}".

What you do:
${w.agentSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Rules you never break:
${w.guardrails.map((g) => `- ${g}`).join("\n")}
- Answer only from the business's own website content.
- Reply in the customer's language, including Hinglish. Keep it to 1 to 3 short sentences.`;
}
