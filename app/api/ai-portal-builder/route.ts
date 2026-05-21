import { NextResponse } from "next/server";

type BuilderInput = {
  clientName?: string;
  clientEmail?: string;
  projectName?: string;
  serviceType?: string;
  projectDescription?: string;
  mainDeliverables?: string;
  dueDate?: string;
  invoiceAmount?: string;
  tone?: "Professional" | "Friendly" | "Premium" | "Simple";
};

type PortalDraft = {
  welcomeMessage: string;
  suggestedTemplateType: string;
  milestones: string[];
  approvalRequests: string[];
  starterProjectUpdates: string[];
  deliverablesChecklist: string[];
  invoiceTitle: string;
};

const MAX_TEXT = 700;
const MAX_SHORT = 90;
const allowedTones = new Set(["Professional", "Friendly", "Premium", "Simple"]);

function cleanText(value: unknown, max = MAX_TEXT) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanList(value: unknown, maxItems: number, maxLength = MAX_SHORT) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeDraft(value: unknown, input: BuilderInput): PortalDraft {
  const data = (value || {}) as Partial<PortalDraft>;
  const fallback = fallbackDraft(input);
  return {
    welcomeMessage: cleanText(data.welcomeMessage, 420) || fallback.welcomeMessage,
    suggestedTemplateType: cleanText(data.suggestedTemplateType, 60) || fallback.suggestedTemplateType,
    milestones: cleanList(data.milestones, 6).length ? cleanList(data.milestones, 6) : fallback.milestones,
    approvalRequests: cleanList(data.approvalRequests, 4).length ? cleanList(data.approvalRequests, 4) : fallback.approvalRequests,
    starterProjectUpdates: cleanList(data.starterProjectUpdates, 4, 220).length ? cleanList(data.starterProjectUpdates, 4, 220) : fallback.starterProjectUpdates,
    deliverablesChecklist: cleanList(data.deliverablesChecklist, 8).length ? cleanList(data.deliverablesChecklist, 8) : fallback.deliverablesChecklist,
    invoiceTitle: cleanText(data.invoiceTitle, 80) || fallback.invoiceTitle,
  };
}

function fallbackDraft(input: BuilderInput): PortalDraft {
  const service = cleanText(input.serviceType, 60) || "Project";
  const project = cleanText(input.projectName, 80) || service;
  const client = cleanText(input.clientName, 60) || "your team";
  const deliverables = cleanText(input.mainDeliverables, 500)
    .split(/,|\n|;/)
    .map((item) => cleanText(item, 80))
    .filter(Boolean)
    .slice(0, 6);
  const checklist = deliverables.length ? deliverables : ["Project brief", "First draft", "Client feedback", "Final deliverables"];
  const dueDate = cleanText(input.dueDate, 40);
  const tone = allowedTones.has(input.tone || "") ? input.tone : "Professional";
  const warm = tone === "Friendly" ? "Thanks for kicking this off." : tone === "Premium" ? "Welcome — your project workspace is ready." : "Welcome to your project portal.";

  return {
    welcomeMessage: `${warm} This is the central place for ${client}'s ${project}: milestones, approvals, files, updates, and payment links${dueDate ? ` through ${dueDate}` : ""}.`,
    suggestedTemplateType: service,
    milestones: ["Project kickoff", "Materials received", "First draft prepared", "Client review", "Revisions complete", "Final handoff"],
    approvalRequests: ["Approve project direction", "Approve first draft", "Approve final deliverables"],
    starterProjectUpdates: [
      "Your client portal is ready. Key milestones, approvals, and project notes will be tracked here.",
      "Initial project details have been reviewed and the first working phase is ready to begin.",
      "Please use this portal for approvals, uploaded assets, and project reference materials.",
    ],
    deliverablesChecklist: checklist,
    invoiceTitle: `${project} invoice`,
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : "";
}

export async function POST(request: Request) {
  let input: BuilderInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const cleaned: BuilderInput = {
    clientName: cleanText(input.clientName, 80),
    clientEmail: cleanText(input.clientEmail, 120),
    projectName: cleanText(input.projectName, 90),
    serviceType: cleanText(input.serviceType, 70),
    projectDescription: cleanText(input.projectDescription, 900),
    mainDeliverables: cleanText(input.mainDeliverables, 700),
    dueDate: cleanText(input.dueDate, 40),
    invoiceAmount: cleanText(input.invoiceAmount, 40),
    tone: allowedTones.has(input.tone || "") ? input.tone : "Professional",
  };

  if (!cleaned.clientName || !cleaned.projectName || !cleaned.projectDescription) {
    return NextResponse.json({ error: "Client name, project name, and project description are required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const endpoint = process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_PORTAL_BUILDER_MODEL || (process.env.OPENROUTER_API_KEY ? "openai/gpt-4o-mini" : "gpt-4o-mini");

  if (!apiKey) {
    return NextResponse.json({ draft: safeDraft(fallbackDraft(cleaned), cleaned), source: "fallback" });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You generate concise client portal setup drafts for a freelancer/agency SaaS. Return only valid JSON with keys: welcomeMessage, suggestedTemplateType, milestones, approvalRequests, starterProjectUpdates, deliverablesChecklist, invoiceTitle. Keep milestones short, practical, and non-rambling. No markdown. No fake claims.",
          },
          {
            role: "user",
            content: JSON.stringify(cleaned),
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ draft: safeDraft(fallbackDraft(cleaned), cleaned), source: "fallback", warning: "AI service unavailable. Generated a safe editable draft instead." });
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(extractJson(content));
    return NextResponse.json({ draft: safeDraft(parsed, cleaned), source: "ai" });
  } catch {
    return NextResponse.json({ draft: safeDraft(fallbackDraft(cleaned), cleaned), source: "fallback", warning: "AI output could not be parsed. Generated a safe editable draft instead." });
  }
}
