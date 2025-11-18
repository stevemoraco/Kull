export interface PromptStyleDefinition {
  starMeaning: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
  colorMeaning?: Record<string, string>;
  includeTitle: boolean;
  includeDescription: boolean;
  includeTags: boolean;
}

export interface DefaultPromptDefinition {
  slug: string;
  title: string;
  summary: string;
  instructions: string;
  shootTypes: string[];
  tags: string[];
  style: PromptStyleDefinition;
  aiScore?: number;
  aiSummary?: string;
}

const sharedInstructions = `You are Kull's culling assistant. For each image you receive, return a JSON array named "ratings".
Each entry must include: image_id, star_rating (0-5), color_label, title, description, and tags (array of strings).
Follow the star and color meanings provided. Use the photographer profile, EXIF data, and geocoded venue context when writing metadata.
Keep titles under 70 characters, descriptions under 280 characters, and limit tags to 8 high-impact keywords.`;

export const defaultPrompts: DefaultPromptDefinition[] = [
  {
    slug: "standard",
    title: "Standard Keeper Workflow",
    summary: "Balanced stars and Lightroom colors suitable for most commercial shoots.",
    instructions: sharedInstructions,
    shootTypes: ["general", "event", "portrait", "commercial"],
    tags: ["standard", "balanced", "default"],
    style: {
      starMeaning: {
        0: "Reject unusable frames (major blur, obstruction, or misfire).",
        1: "Outtakes or heavily flawed frames kept only for reference.",
        2: "Duplicates or backups that are technically fine but redundant.",
        3: "Usable client proof: solid exposure and story but not standout.",
        4: "Strong keeper worthy of delivery and light retouching.",
        5: "Hero image that represents the shoot at its best.",
      },
      colorMeaning: {
        red: "Reject queue (auto-hidden in Lightroom)",
        yellow: "Client proofs / review set",
        green: "Final delivery edits",
        blue: "Hero selections for marketing",
        purple: "Needs retouch or composite",
      },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
    },
    aiScore: 9.4,
    aiSummary: "Versatile baseline preset emphasizing clear hero selection and retouch workflow cues.",
  },
  {
    slug: "wedding-storytelling",
    title: "Wedding Storytelling",
    summary: "Story-driven culling with emphasis on moments, portraits, and details for wedding deliverables.",
    instructions: sharedInstructions,
    shootTypes: ["wedding", "event"],
    tags: ["wedding", "story", "emotion", "ceremony"],
    style: {
      starMeaning: {
        0: "Reject frames that cannot be salvaged (blur, obstruction, guests blinking).",
        1: "Keep only if they document scheduling or vendor information.",
        2: "Secondary angles or near-duplicates of stronger frames.",
        3: "Essential storytelling moments included in client proof gallery.",
        4: "Album-worthy keeper showing strong emotion or detail.",
        5: "Signature hero portrait or peak moment for marketing.",
      },
      colorMeaning: {
        red: "Remove from proofing",
        yellow: "Family & ceremony moments",
        green: "Album spreads",
        blue: "Social hero shots",
        purple: "Requires retouch (skin, distractions)",
      },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
    },
    aiScore: 9.6,
    aiSummary: "Prioritizes emotional beats and album flow, guiding retouch and storytelling cues.",
  },
  {
    slug: "corporate-event",
    title: "Corporate Event Coverage",
    summary: "Efficient selection for conferences, brand activations, and networking events.",
    instructions: sharedInstructions,
    shootTypes: ["event", "corporate"],
    tags: ["corporate", "conference", "networking"],
    style: {
      starMeaning: {
        0: "Reject heavy blur, obstructed faces, or technical misfires.",
        1: "Audience filler frames with little narrative value.",
        2: "Alternate angles or duplicates of speakers/panels.",
        3: "Usable coverage for recap galleries and press.",
        4: "Marketing-ready hero showing brand moments or key speakers.",
        5: "Headline imagery ideal for sponsorship decks and PR.",
      },
      colorMeaning: {
        red: "Discard",
        yellow: "General coverage",
        green: "Press-ready",
        blue: "Hero marketing",
        purple: "Needs signage cleanup",
      },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
    },
    aiScore: 9.1,
    aiSummary: "Highlights sponsor deliverables and PR angles while filtering redundant crowd shots.",
  },
  {
    slug: "sports-action",
    title: "Sports Action Highlights",
    summary: "Fast filtering for action sports with emphasis on peak moments and storytelling continuity.",
    instructions: sharedInstructions,
    shootTypes: ["sports", "action"],
    tags: ["sports", "athlete", "action", "peak"],
    style: {
      starMeaning: {
        0: "Reject blurred action or blocked athletes.",
        1: "Late/early frames or sideline context only.",
        2: "Backup angles or plays with limited drama.",
        3: "Solid coverage frames for team archives.",
        4: "Highlight plays useful for recaps and social media.",
        5: "Iconic hero shot worthy of media headlines and posters.",
      },
      colorMeaning: {
        red: "Drop",
        yellow: "Archive",
        green: "Team share",
        blue: "Hero highlight",
        purple: "Composite jersey cleanup",
      },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
    },
    aiScore: 9.3,
    aiSummary: "Targets peak action and narrative progression while tagging players and plays automatically.",
  },
  {
    slug: "portrait-session",
    title: "Portrait Session Flow",
    summary: "Culling system for headshots and lifestyle portrait sets with retouch flags.",
    instructions: sharedInstructions,
    shootTypes: ["portrait", "lifestyle"],
    tags: ["portrait", "lifestyle", "headshot"],
    style: {
      starMeaning: {
        0: "Reject for blinks, awkward expressions, or severe technical issues.",
        1: "Reference poses or lighting tests only.",
        2: "Alternate pose or expression similar to stronger frame.",
        3: "Deliverable portrait suitable for client proof.",
        4: "Portfolio-grade keeper deserving refinement.",
        5: "Hero image for banners, campaigns, or cover use.",
      },
      colorMeaning: {
        red: "Reject",
        yellow: "Client proof",
        green: "Portfolio keeper",
        blue: "Hero selection",
        purple: "Retouch skin/flyaways",
      },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
    },
    aiScore: 9.2,
    aiSummary: "Balances proofing needs with high-end retouch flags for editorial portrait work.",
  },
  {
    slug: "product-ecommerce",
    title: "Product & E-commerce",
    summary: "Structured culling for catalog, PDP, and hero product imagery.",
    instructions: sharedInstructions,
    shootTypes: ["product", "ecommerce", "catalog"],
    tags: ["product", "catalog", "ecommerce"],
    style: {
      starMeaning: {
        0: "Reject misaligned product, major dust, or focus miss.",
        1: "Reference lighting tests or setup documentation.",
        2: "Alternate angles with minor issues that can be fixed later.",
        3: "Standard listing image suitable for PDP.",
        4: "Feature image for marketing or carousel sections.",
        5: "Hero product shot for advertising and banners.",
      },
      colorMeaning: {
        red: "Reject",
        yellow: "PDP listing",
        green: "Feature image",
        blue: "Campaign hero",
        purple: "Retouch dust/reflections",
      },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
    },
    aiScore: 9.5,
    aiSummary: "Optimized for PDP hierarchy with clean tagging for materials, SKU, and merchandising.",
  },
  {
    slug: "real-estate",
    title: "Real Estate Showcase",
    summary: "Culling logic for interior/exterior sets with attention to MLS and marketing priorities.",
    instructions: sharedInstructions,
    shootTypes: ["real-estate", "architecture"],
    tags: ["real estate", "architecture", "interior"],
    style: {
      starMeaning: {
        0: "Reject severe distortion, personal clutter, or unusable lighting.",
        1: "Reference exposures or HDR brackets not needed.",
        2: "Alternate angles that duplicate stronger comps.",
        3: "MLS-ready listing image showing each room.",
        4: "Marketing-ready hero for brochures and websites.",
        5: "Signature image for banners or editorial features.",
      },
      colorMeaning: {
        red: "Remove",
        yellow: "MLS listing",
        green: "Marketing set",
        blue: "Hero feature",
        purple: "Requires object removal",
      },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
    },
    aiScore: 9.0,
    aiSummary: "Ensures complete room coverage while surfacing marketing heroes and retouch notes.",
  },
];

export type { DefaultPromptDefinition as PromptSeedDefinition };
