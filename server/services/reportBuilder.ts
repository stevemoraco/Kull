import type { GenerateReportInput } from "../report";
import { summarize, generateNarrative } from "../report";

type Rating = GenerateReportInput["ratings"][number];

export type HeroShot = {
  imageId?: string;
  filename?: string;
  starRating: number;
  colorLabel?: string;
  title?: string;
  description?: string;
  tags?: string[];
  previewUrl?: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
};

export type ShootReport = {
  shootName: string;
  generatedAt: string;
  narrative: string;
  stats: ReturnType<typeof summarize>;
  heroes: HeroShot[];
  notifications: {
    desktop: NotificationPayload;
    mobile: NotificationPayload;
  };
};

export type BuildShootReportOptions = {
  shootName?: string;
  ratings: Rating[];
  heroLimit?: number;
  previewBaseUrl?: string;
  apiKey?: string;
  narrativeGenerator?: (input: GenerateReportInput, apiKey?: string) => Promise<string>;
};

export async function buildShootReport({
  shootName,
  ratings,
  heroLimit,
  previewBaseUrl,
  apiKey,
  narrativeGenerator,
}: BuildShootReportOptions): Promise<ShootReport> {
  const sanitizedName = shootName && shootName.trim().length ? shootName.trim() : "Untitled Shoot";
  const stats = summarize(ratings);
  const limit = Math.max(1, Math.min(heroLimit ?? 5, 25));

  const heroCandidates = selectHeroShots(ratings, limit);
  const heroes = heroCandidates.map((rating) => withPreviewUrl(rating, previewBaseUrl));

  const generator = narrativeGenerator ?? generateNarrative;
  const narrative = await generator(
    {
      shootName: sanitizedName,
      ratings,
      previewBaseUrl,
      heroLimit: limit,
    },
    apiKey,
  );

  return {
    shootName: sanitizedName,
    generatedAt: new Date().toISOString(),
    narrative,
    stats,
    heroes,
    notifications: buildNotifications(sanitizedName, stats, heroes),
  };
}

const selectHeroShots = (ratings: Rating[], limit: number): HeroShot[] => {
  const sorted = ratings
    .slice()
    .sort((a, b) => {
      const starDiff = (b.starRating ?? 0) - (a.starRating ?? 0);
      if (starDiff !== 0) return starDiff;
      const aTitle = a.title ?? "";
      const bTitle = b.title ?? "";
      return aTitle.localeCompare(bTitle);
    });

  const candidates = sorted.filter((r) => (r.starRating ?? 0) >= 4).slice(0, limit);
  return candidates.map((rating) => ({
    imageId: rating.imageId,
    filename: rating.filename,
    starRating: rating.starRating ?? 0,
    colorLabel: rating.colorLabel,
    title: rating.title,
    description: rating.description,
    tags: rating.tags,
  }));
};

const withPreviewUrl = (rating: HeroShot, previewBaseUrl?: string): HeroShot => {
  if (!previewBaseUrl) return rating;
  const identifier = rating.filename ?? rating.imageId;
  if (!identifier) return rating;
  const base = previewBaseUrl.endsWith("/") ? previewBaseUrl.slice(0, -1) : previewBaseUrl;
  const url = `${base}/${encodeURIComponent(identifier)}`;
  return {
    ...rating,
    previewUrl: url,
  };
};

const buildNotifications = (
  shootName: string,
  stats: ReturnType<typeof summarize>,
  heroes: HeroShot[],
) => {
  const heroSnippet = heroes[0]?.title ?? heroes[0]?.filename ?? heroes[0]?.imageId;
  const heroSummary = stats.heroCount === 1 ? "hero" : "heroes";
  const keeperSummary = stats.keeperCount === 1 ? "keeper" : "keepers";
  const desktop: NotificationPayload = {
    title: `${shootName}: ${stats.heroCount} ${heroSummary} ready`,
    body: [
      `${stats.totalImages} images processed`,
      `${stats.heroCount} ${heroSummary}`,
      `${stats.keeperCount} ${keeperSummary}`,
      heroSnippet ? `Top pick: ${heroSnippet}` : undefined,
    ]
      .filter(Boolean)
      .join(" • "),
  };

  const mobile: NotificationPayload = {
    title: desktop.title,
    body: heroSnippet
      ? `${stats.heroCount} ${heroSummary}, ${stats.keeperCount} ${keeperSummary}. Top pick: ${heroSnippet}`
      : `${stats.heroCount} ${heroSummary}, ${stats.keeperCount} ${keeperSummary}.`,
  };

  return { desktop, mobile };
};
