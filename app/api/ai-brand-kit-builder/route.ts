import { NextResponse } from "next/server";
import type { BrandKitDraft } from "@/lib/brand-kit";

type BrandKitInput = {
  businessName?: string;
  industry?: string;
  targetAudience?: string;
  mainOffer?: string;
  brandPersonality?: string;
  moodWords?: string;
  competitors?: string;
  brandsTheyLike?: string;
  colorsLiked?: string;
  colorsToAvoid?: string;
  logoStylePreference?: string;
  websiteOrSocialLinks?: string;
  notes?: string;
};

const MAX_TEXT = 800;
const MAX_SHORT = 120;
const HEX_PATTERN = /^#[0-9A-F]{6}$/i;

function cleanText(value: unknown, max = MAX_TEXT) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function splitList(value: unknown, maxItems = 8, maxLength = MAX_SHORT) {
  return cleanText(value, 700)
    .split(/,|\n|;/)
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanList(value: unknown, fallback: string[], maxItems = 8, maxLength = MAX_SHORT) {
  const list = Array.isArray(value) ? value : [];
  const cleaned = list.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems);
  return cleaned.length ? cleaned : fallback;
}

function cleanHex(value: unknown, fallback: string) {
  const hex = cleanText(value, 7);
  return HEX_PATTERN.test(hex) ? hex.toUpperCase() : fallback;
}

function cleanColor(value: unknown, fallback: { name: string; hex: string; usage: string }) {
  const color = (value || {}) as Partial<{ name: string; hex: string; usage: string }>;
  return {
    name: cleanText(color.name, 40) || fallback.name,
    hex: cleanHex(color.hex, fallback.hex),
    usage: cleanText(color.usage, 140) || fallback.usage,
  };
}

function fallbackDraft(input: BrandKitInput): BrandKitDraft {
  const business = cleanText(input.businessName, 90) || "Client Brand";
  const industry = cleanText(input.industry, 80) || "service business";
  const audience = cleanText(input.targetAudience, 120) || "ideal clients";
  const moodWords = splitList(input.moodWords || input.brandPersonality, 5);
  const personality = moodWords.length ? moodWords : ["clear", "professional", "trustworthy"];
  const likedColors = splitList(input.colorsLiked, 4).join(", ") || "balanced, approachable colors";
  const logoStyle = cleanText(input.logoStylePreference, 100) || "clean wordmark with a simple symbol";

  return {
    brandSummary: `${business} needs a polished brand direction for a ${industry} serving ${audience}. The identity should feel ${personality.join(", ")} without becoming generic or overdesigned.`,
    positioning: `${business} should present itself as a clear, credible choice for ${audience} who want ${cleanText(input.mainOffer, 140) || "a dependable solution"}.`,
    audienceProfile: `${audience} looking for a brand that feels professional, easy to trust, and simple to understand quickly.`,
    brandPersonality: personality,
    voiceAndTone: {
      voice: "Clear, confident, helpful, and polished.",
      toneRules: ["Use direct language", "Sound credible without hype", "Keep claims specific", "Write for the buyer's practical goal"],
      avoid: ["Generic buzzwords", "Overly cute language", "Unsupported claims", "Visual clutter"],
    },
    logoConcepts: [
      {
        name: "Clean Signature Mark",
        concept: `A refined ${logoStyle} built around the business name with one memorable detail.` ,
        symbolIdeas: ["Initial-based mark", "Simple geometric container", "Subtle industry cue"],
        wordmarkDirection: "Balanced spacing, clean letterforms, and a calm professional rhythm.",
        bestFor: ["Website header", "Proposal cover", "Social profile"],
        whyItFits: "It gives the brand a usable, professional direction without relying on complex illustration.",
      },
      {
        name: "Modern Emblem System",
        concept: "A compact emblem that can sit beside the wordmark or stand alone as an icon.",
        symbolIdeas: ["Soft badge", "Abstract service symbol", "Simple monogram"],
        wordmarkDirection: "Modern sans-serif wordmark with a slightly premium feel.",
        bestFor: ["Business cards", "Portal header", "Packaging or collateral"],
        whyItFits: "It creates a flexible system for both digital and client-facing materials.",
      },
      {
        name: "Editorial Wordmark",
        concept: "A type-led logo direction that uses typography, spacing, and restraint as the main brand signal.",
        symbolIdeas: ["Small divider mark", "Minimal underline", "Simple accent glyph"],
        wordmarkDirection: "Elegant heading-style lettering supported by clean body typography.",
        bestFor: ["Landing page hero", "PDF guide", "Client documents"],
        whyItFits: "It feels polished and mature while staying easy to implement.",
      },
    ],
    colorPalette: {
      primary: { name: "Deep Charcoal", hex: "#1F2933", usage: "Primary text, headers, and high-trust moments." },
      secondary: { name: "Warm Neutral", hex: "#F4EFE7", usage: `Backgrounds and spacious layouts; pairs well with ${likedColors}.` },
      accent: { name: "Muted Sage", hex: "#7E9278", usage: "Buttons, highlights, and section accents." },
      neutral: { name: "Soft Gray", hex: "#D8DEE4", usage: "Borders, cards, and quiet interface structure." },
    },
    typography: {
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      accentFont: "Montserrat",
      usageRules: ["Use the heading font for hero lines and section titles", "Use Inter for all body copy and UI labels", "Use the accent font sparingly for small uppercase labels"],
    },
    imageStyle: {
      photographyStyle: "Natural light, clean compositions, warm neutrals, and detail-focused images that feel real rather than staged.",
      textureStyle: "Subtle paper, soft shadows, natural materials, and simple surface textures.",
      backgroundStyle: "Warm off-white, charcoal text blocks, spacious cards, and low-contrast section breaks.",
      use: ["Clear subject focus", "Warm natural lighting", "Simple negative space", "Relevant industry details"],
      avoid: ["Generic stock people", "Neon colors", "Busy collage layouts", "Overly harsh contrast"],
    },
    moodBoard: {
      brandWords: personality,
      layoutSections: ["Color palette", "Typography pairing", "Logo concept cards", "Image direction", "Texture references", "Voice samples"],
      imagePrompts: [`${business} brand mood board for ${industry}, ${personality.join(", ")}, professional visual direction, ${likedColors}, clean premium layout`],
      textureReferences: ["Warm paper", "Soft shadow", "Natural material close-up", "Minimal card layout"],
    },
    styleGuide: {
      visualRules: ["Keep layouts spacious", "Use one clear focal point per section", "Pair warm neutrals with a grounded accent", "Use logo concepts as direction, not final trademark assets"],
      doRules: ["Use consistent spacing", "Keep copy clear", "Show real work or relevant visuals", "Document color and font usage"],
      dontRules: ["Do not claim trademark safety", "Do not use fake testimonials", "Do not overcomplicate the logo", "Do not mix too many typefaces"],
    },
  };
}

function safeDraft(value: unknown, input: BrandKitInput): BrandKitDraft {
  const data = (value || {}) as Partial<BrandKitDraft>;
  const fallback = fallbackDraft(input);
  const logoConcepts = Array.isArray(data.logoConcepts) ? data.logoConcepts.slice(0, 5) : [];
  return {
    brandSummary: cleanText(data.brandSummary, 500) || fallback.brandSummary,
    positioning: cleanText(data.positioning, 500) || fallback.positioning,
    audienceProfile: cleanText(data.audienceProfile, 420) || fallback.audienceProfile,
    brandPersonality: cleanList(data.brandPersonality, fallback.brandPersonality, 6, 40),
    voiceAndTone: {
      voice: cleanText(data.voiceAndTone?.voice, 220) || fallback.voiceAndTone.voice,
      toneRules: cleanList(data.voiceAndTone?.toneRules, fallback.voiceAndTone.toneRules, 6),
      avoid: cleanList(data.voiceAndTone?.avoid, fallback.voiceAndTone.avoid, 6),
    },
    logoConcepts: logoConcepts.length ? logoConcepts.map((concept, index) => ({
      name: cleanText(concept?.name, 80) || fallback.logoConcepts[index % fallback.logoConcepts.length].name,
      concept: cleanText(concept?.concept, 280) || fallback.logoConcepts[index % fallback.logoConcepts.length].concept,
      symbolIdeas: cleanList(concept?.symbolIdeas, fallback.logoConcepts[index % fallback.logoConcepts.length].symbolIdeas, 5),
      wordmarkDirection: cleanText(concept?.wordmarkDirection, 220) || fallback.logoConcepts[index % fallback.logoConcepts.length].wordmarkDirection,
      bestFor: cleanList(concept?.bestFor, fallback.logoConcepts[index % fallback.logoConcepts.length].bestFor, 5),
      whyItFits: cleanText(concept?.whyItFits, 220) || fallback.logoConcepts[index % fallback.logoConcepts.length].whyItFits,
    })) : fallback.logoConcepts,
    colorPalette: {
      primary: cleanColor(data.colorPalette?.primary, fallback.colorPalette.primary),
      secondary: cleanColor(data.colorPalette?.secondary, fallback.colorPalette.secondary),
      accent: cleanColor(data.colorPalette?.accent, fallback.colorPalette.accent),
      neutral: cleanColor(data.colorPalette?.neutral, fallback.colorPalette.neutral),
    },
    typography: {
      headingFont: cleanText(data.typography?.headingFont, 80) || fallback.typography.headingFont,
      bodyFont: cleanText(data.typography?.bodyFont, 80) || fallback.typography.bodyFont,
      accentFont: cleanText(data.typography?.accentFont, 80) || fallback.typography.accentFont,
      usageRules: cleanList(data.typography?.usageRules, fallback.typography.usageRules, 6),
    },
    imageStyle: {
      photographyStyle: cleanText(data.imageStyle?.photographyStyle, 300) || fallback.imageStyle.photographyStyle,
      textureStyle: cleanText(data.imageStyle?.textureStyle, 220) || fallback.imageStyle.textureStyle,
      backgroundStyle: cleanText(data.imageStyle?.backgroundStyle, 220) || fallback.imageStyle.backgroundStyle,
      use: cleanList(data.imageStyle?.use, fallback.imageStyle.use, 6),
      avoid: cleanList(data.imageStyle?.avoid, fallback.imageStyle.avoid, 6),
    },
    moodBoard: {
      brandWords: cleanList(data.moodBoard?.brandWords, fallback.moodBoard.brandWords, 8, 40),
      layoutSections: cleanList(data.moodBoard?.layoutSections, fallback.moodBoard.layoutSections, 8),
      imagePrompts: cleanList(data.moodBoard?.imagePrompts, fallback.moodBoard.imagePrompts, 4, 260),
      textureReferences: cleanList(data.moodBoard?.textureReferences, fallback.moodBoard.textureReferences, 6),
    },
    styleGuide: {
      visualRules: cleanList(data.styleGuide?.visualRules, fallback.styleGuide.visualRules, 8),
      doRules: cleanList(data.styleGuide?.doRules, fallback.styleGuide.doRules, 8),
      dontRules: cleanList(data.styleGuide?.dontRules, fallback.styleGuide.dontRules, 8),
    },
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : "";
}

export async function POST(request: Request) {
  let input: BrandKitInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const cleaned: BrandKitInput = {
    businessName: cleanText(input.businessName, 90),
    industry: cleanText(input.industry, 80),
    targetAudience: cleanText(input.targetAudience, 140),
    mainOffer: cleanText(input.mainOffer, 180),
    brandPersonality: cleanText(input.brandPersonality, 240),
    moodWords: cleanText(input.moodWords, 240),
    competitors: cleanText(input.competitors, 240),
    brandsTheyLike: cleanText(input.brandsTheyLike, 240),
    colorsLiked: cleanText(input.colorsLiked, 160),
    colorsToAvoid: cleanText(input.colorsToAvoid, 160),
    logoStylePreference: cleanText(input.logoStylePreference, 140),
    websiteOrSocialLinks: cleanText(input.websiteOrSocialLinks, 240),
    notes: cleanText(input.notes, 400),
  };

  if (!cleaned.businessName || !cleaned.industry || !cleaned.targetAudience) {
    return NextResponse.json({ error: "Business name, industry, and target audience are required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const endpoint = process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_PORTAL_BUILDER_MODEL || (process.env.OPENROUTER_API_KEY ? "openai/gpt-4o-mini" : "gpt-4o-mini");

  if (!apiKey) return NextResponse.json({ draft: safeDraft(fallbackDraft(cleaned), cleaned), source: "fallback" });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You generate concise brand kit drafts for freelancers and agencies. Return only valid JSON. Do not generate final logos. Do not claim trademark safety. Do not invent testimonials. Required keys: brandSummary, positioning, audienceProfile, brandPersonality, voiceAndTone, logoConcepts, colorPalette, typography, imageStyle, moodBoard, styleGuide. Use mostly Google Fonts. Include 3-5 logo concept directions, not final logos.",
          },
          { role: "user", content: JSON.stringify(cleaned) },
        ],
      }),
    });
    if (!response.ok) return NextResponse.json({ draft: safeDraft(fallbackDraft(cleaned), cleaned), source: "fallback", warning: "AI service unavailable. Generated a safe editable brand kit draft instead." });
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(extractJson(content));
    return NextResponse.json({ draft: safeDraft(parsed, cleaned), source: "ai" });
  } catch {
    return NextResponse.json({ draft: safeDraft(fallbackDraft(cleaned), cleaned), source: "fallback", warning: "AI brand kit output could not be parsed. Generated a safe editable draft instead." });
  }
}
