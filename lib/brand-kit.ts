export type BrandKitDraft = {
  brandSummary: string;
  positioning: string;
  audienceProfile: string;
  brandPersonality: string[];
  voiceAndTone: {
    voice: string;
    toneRules: string[];
    avoid: string[];
  };
  logoConcepts: {
    name: string;
    concept: string;
    symbolIdeas: string[];
    wordmarkDirection: string;
    bestFor: string[];
    whyItFits: string;
  }[];
  colorPalette: {
    primary: BrandColor;
    secondary: BrandColor;
    accent: BrandColor;
    neutral: BrandColor;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    accentFont: string;
    usageRules: string[];
  };
  imageStyle: {
    photographyStyle: string;
    textureStyle: string;
    backgroundStyle: string;
    use: string[];
    avoid: string[];
  };
  moodBoard: {
    brandWords: string[];
    layoutSections: string[];
    imagePrompts: string[];
    textureReferences: string[];
  };
  styleGuide: {
    visualRules: string[];
    doRules: string[];
    dontRules: string[];
  };
};

export type BrandColor = {
  name: string;
  hex: string;
  usage: string;
};

export const BRAND_KIT_UPDATE_TITLE = "Brand Kit";
export const BRAND_KIT_BODY_PREFIX = "HANDOFFHQ_BRAND_KIT_JSON:";

export function encodeBrandKitDraft(draft: BrandKitDraft) {
  return `${BRAND_KIT_BODY_PREFIX}${JSON.stringify(draft)}`;
}

export function parseBrandKitDraft(body: string): BrandKitDraft | null {
  if (!body.startsWith(BRAND_KIT_BODY_PREFIX)) return null;
  try {
    return JSON.parse(body.slice(BRAND_KIT_BODY_PREFIX.length)) as BrandKitDraft;
  } catch {
    return null;
  }
}

export function brandKitToClientSummary(draft: BrandKitDraft) {
  return [
    `Brand Summary: ${draft.brandSummary}`,
    `Positioning: ${draft.positioning}`,
    `Personality: ${draft.brandPersonality.join(", ")}`,
    `Logo Concepts: ${draft.logoConcepts.map((concept) => concept.name).join(", ")}`,
    `Colors: ${draft.colorPalette.primary.name}, ${draft.colorPalette.secondary.name}, ${draft.colorPalette.accent.name}, ${draft.colorPalette.neutral.name}`,
    `Typography: ${draft.typography.headingFont} + ${draft.typography.bodyFont}`,
  ].join("\n");
}
