import { test, expect } from "@playwright/test";

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

const mockUser = {
  id: "user-marketplace",
  email: "curator@kullai.com",
  firstName: "Curator",
  lastName: "Pro",
  subscriptionTier: "studio",
  subscriptionStatus: "active",
  trialStartedAt: iso(-5 * 24 * 3600 * 1000),
  trialEndsAt: iso(24 * 3600 * 1000),
  specialOfferExpiresAt: iso(3 * 3600 * 1000),
  createdAt: iso(-30 * 24 * 3600 * 1000),
  updatedAt: iso(0),
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripePaymentMethodId: null,
  stripeSetupIntentId: null,
  profileImageUrl: null,
  appInstalledAt: null,
  folderCatalog: null,
};

const basePrompt = {
  authorProfile: {
    id: "author-1",
    email: "pro@kullai.com",
    displayName: "Pro Photographer",
    bio: "Award-winning wedding storyteller.",
    avatarUrl: undefined,
  },
  style: {
    starMeaning: {
      0: "Reject blurry or unusable frames",
      1: "Cull unless story demands it",
      2: "Reserve for client proofing only",
      3: "Good supporting frame",
      4: "Primary gallery keeper",
      5: "Hero cover-worthy moment",
    },
    includeTitle: true,
    includeDescription: true,
    includeTags: true,
  },
  sharedWithMarketplace: true,
};

test.describe("Prompt marketplace", () => {
  test.beforeEach(async ({ page }) => {
    const prompts = [
      {
        ...basePrompt,
        id: "prompt-1",
        slug: "wedding-cinematic",
        title: "Wedding Cinematic Storytelling",
        summary: "Prioritise emotional hero moments with warm grading.",
        instructions: "Deliver 5★ for cinematic emotional beats. Add title + tags per hero.",
        shootTypes: ["Wedding"],
        tags: ["cinematic", "warm", "story"],
        aiScore: 9.2,
        humanScore: 9.5,
        ratingsCount: 182,
        createdAt: iso(-10 * 24 * 3600 * 1000),
        updatedAt: iso(-2 * 24 * 3600 * 1000),
      },
      {
        ...basePrompt,
        id: "prompt-2",
        slug: "portrait-editorial",
        title: "Editorial Portrait Session",
        summary: "Balance hero portraits and detail shots for agency delivery.",
        instructions: "Rate sharp editorial hero frames as 5★, metadata emphasises wardrobe & pose.",
        shootTypes: ["Portrait"],
        tags: ["editorial", "portrait"],
        aiScore: 8.7,
        humanScore: 8.9,
        ratingsCount: 94,
        createdAt: iso(-15 * 24 * 3600 * 1000),
        updatedAt: iso(-5 * 24 * 3600 * 1000),
      },
    ];

    const savedSlugs = new Set<string>();

    await page.route("**/api/auth/user", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockUser),
      });
    });

    await page.route("**/api/prompts", async (route) => {
      if (route.request().method() !== "GET") {
        await route.abort();
        return;
      }
      const url = new URL(route.request().url());
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const filtered = search
        ? prompts.filter(
            (prompt) =>
              prompt.title.toLowerCase().includes(search) ||
              prompt.summary.toLowerCase().includes(search) ||
              prompt.tags.some((tag: string) => tag.toLowerCase().includes(search)),
          )
        : prompts;
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered),
      });
    });

    await page.route("**/api/prompts/my", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          created: [],
          saved: prompts.filter((prompt) => savedSlugs.has(prompt.slug)),
        }),
      });
    });

    await page.route(/\/api\/prompts\/[^/]+\/vote$/, async (route) => {
      const slug = route.request().url().split("/").slice(-2)[0];
      const payload = JSON.parse(route.request().postData() ?? "{}") as { value?: "up" | "down" };
      const prompt = prompts.find((item) => item.slug === slug);
      if (!prompt || !payload.value) {
        await route.fulfill({ status: 400, body: JSON.stringify({ message: "invalid vote" }) });
        return;
      }
      prompt.ratingsCount += 1;
      if (payload.value === "up") {
        prompt.humanScore = Math.min(10, (prompt.humanScore ?? prompt.aiScore ?? 0) + 0.1);
      } else {
        prompt.humanScore = Math.max(0, (prompt.humanScore ?? prompt.aiScore ?? 0) - 0.1);
      }
      prompt.updatedAt = iso(0);
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt),
      });
    });

    await page.route(/\/api\/prompts\/[^/]+\/save$/, async (route) => {
      const slug = route.request().url().split("/").slice(-2)[0];
      if (savedSlugs.has(slug)) {
        savedSlugs.delete(slug);
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: false }),
        });
        return;
      }
      savedSlugs.add(slug);
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: true }),
      });
    });
  });

  test("filters, views, and interacts with marketplace prompts", async ({ page }) => {
    await page.goto("/prompts");

    await expect(
      page.getByRole("heading", { name: "Discover ready-to-run culling presets" }),
    ).toBeVisible();
    await expect(page.getByText("Wedding Cinematic Storytelling")).toBeVisible();

    const searchInput = page.locator('input[placeholder="Search prompts or creators"]');
    await searchInput.fill("portrait");
    await expect(page.getByText("Editorial Portrait Session")).toBeVisible();
    await expect(page.getByText("Wedding Cinematic Storytelling")).not.toBeVisible();

    await page.getByRole("button", { name: "View details" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Editorial Portrait Session" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await searchInput.fill("");
    await expect(page.getByText("Wedding Cinematic Storytelling")).toBeVisible();

    const upvoteResponse = page.waitForResponse(
      (response) =>
        /\/api\/prompts\/[^/]+\/vote$/.test(response.url()) &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Upvote" }).first().click();
    await expect((await upvoteResponse).ok()).toBeTruthy();
  });
});
