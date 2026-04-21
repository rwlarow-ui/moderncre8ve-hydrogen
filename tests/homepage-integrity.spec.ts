import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const requiredHomepageLinks = [
  "/collections",
  "/collections/mid-century-modern-dining-tables",
  "/collections/scandinavian-design-furniture",
  "/collections/all-products",
  "/products/minimalist-bed-frame-ohio",
  "/products/scandinavian-oval-dining-table-mar-vista",
  "/products/the-seymour-modern-dining-chair",
  "/pages/about-us",
  "/blogs/mid-century-modern-scandi-japandi-design-blog",
  "/policies/privacy-policy",
  "/sitemap-html",
];

async function assertHomepageIntegrity(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator('a[href="/faq/about-us-1"]')).toHaveCount(0);
  await expect(page.locator('a[href="/products/"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Example Product Title");
  await expect(page.locator("body")).not.toContainText("Product placeholder");

  for (const href of requiredHomepageLinks) {
    await expect(async () => {
      expect(await page.locator(`a[href="${href}"]`).count()).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });
  }
}

test("desktop homepage does not leak broken or demo homepage links", async ({
  page,
}) => {
  await assertHomepageIntegrity(page);

  const hotspotTriggers = page.locator(
    '[data-wv-type="hotspots--item"], [data-wv-type="testimonial-hot--item"]',
  );

  const count = await hotspotTriggers.count();
  for (let index = 0; index < count; index++) {
    await hotspotTriggers.nth(index).hover({ force: true });
  }

  await expect(page.locator('a[href="/products/"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Example Product Title");
});

test.describe("mobile homepage integrity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("mobile homepage stays free of placeholder links and content", async ({
    page,
  }) => {
    await assertHomepageIntegrity(page);

    const hotspotTriggers = page.locator(
      '[data-wv-type="hotspots--item"], [data-wv-type="testimonial-hot--item"]',
    );

    const count = await hotspotTriggers.count();
    if (count > 0) {
      await hotspotTriggers.first().click({ force: true });
      await expect(page.locator("body")).not.toContainText("Example Product Title");
      await expect(page.locator('a[href="/products/"]')).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
  });
});
