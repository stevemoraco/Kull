import { test, expect } from "@playwright/test";

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

const mockUser = {
  id: "user-studio-001",
  email: "steve@kullai.com",
  firstName: "Steve",
  lastName: "Moraco",
  subscriptionTier: "studio",
  subscriptionStatus: "active",
  trialStartedAt: iso(-3 * 24 * 3600 * 1000),
  trialEndsAt: iso(24 * 3600 * 1000),
  specialOfferExpiresAt: iso(2 * 3600 * 1000),
  createdAt: iso(-7 * 24 * 3600 * 1000),
  updatedAt: iso(0),
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripePaymentMethodId: null,
  stripeSetupIntentId: null,
  profileImageUrl: null,
  appInstalledAt: null,
  folderCatalog: null,
};

test.describe("Authenticated dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const referrals: any[] = [
      {
        id: "ref-initial",
        referrerId: mockUser.id,
        referredEmail: "existing@kullai.com",
        referredUserId: null,
        status: "pending",
        bonusUnlocked: null,
        createdAt: iso(-1 * 24 * 3600 * 1000),
      },
    ];

    await page.route("**/api/auth/user", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockUser),
      });
    });

    await page.route("**/api/referrals", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(referrals),
        });
        return;
      }

      if (route.request().method() === "POST") {
        const payload = JSON.parse(route.request().postData() ?? "{}") as { referredEmail?: string };
        const created = {
          id: `ref-${referrals.length + 1}`,
          referrerId: mockUser.id,
          referredEmail: payload.referredEmail ?? "unknown@example.com",
          referredUserId: null,
          status: "pending",
          bonusUnlocked: null,
          createdAt: iso(0),
        };
        referrals.push(created);
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(created),
        });
        return;
      }

      await route.abort();
    });
  });

  test("loads subscription dashboard and sends referrals", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("text-welcome-headline")).toHaveText(
      /Welcome to Kull AI, Steve/i,
    );
    await expect(page.getByTestId("text-user-email")).toHaveText("steve@kullai.com");
    await expect(page.getByTestId("button-download-dmg")).toBeVisible();

    await page.getByTestId("input-referral-email-0").fill("newfriend@example.com");

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/referrals") && response.request().method() === "POST",
    );

    await page.getByTestId("button-send-referrals").click();

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.referredEmail).toBe("newfriend@example.com");

    await expect(page.getByTestId("input-referral-email-0")).toHaveValue("");
    await expect(
      page.getByText("newfriend@example.com", { exact: false }),
    ).toBeVisible();
  });
});
