import { test, expect } from "@playwright/test";

test.describe("Landing experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/user", async (route) => {
      await route.fulfill({ status: 401, body: "" });
    });
  });

  test("shows marketing page for signed-out visitors", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("text-logo")).toHaveText("Kull AI");
    await expect(page.getByTestId("button-login-nav")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Choose Your Plan",
      }),
    ).toBeVisible();
    await expect(page.getByText("Sign In", { exact: true })).toBeVisible();
  });
});
