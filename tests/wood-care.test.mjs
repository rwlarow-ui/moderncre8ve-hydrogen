import assert from "node:assert/strict";
import test from "node:test";
import { WOOD_CARE_CONTENT, woodCareContent } from "../app/utils/wood-care.ts";

const TITLE_SUFFIX = " | ModernCre8ve";

test("the wax has wood-care content", () => {
  assert.ok(woodCareContent("lareauxs-furniture-wax"));
  assert.equal(woodCareContent("the-zoe"), undefined);
  assert.equal(woodCareContent(undefined), undefined);
});

for (const [handle, c] of Object.entries(WOOD_CARE_CONTENT)) {
  test(`${handle}: SEO title and meta fit the limits`, () => {
    assert.ok(
      (c.seoTitle + TITLE_SUFFIX).length <= 60,
      `title is ${(c.seoTitle + TITLE_SUFFIX).length} chars`,
    );
    assert.ok(!c.seoTitle.includes("ModernCre8ve"), "template adds the brand");
    assert.ok(
      c.seoDescription.length <= 155,
      `meta is ${c.seoDescription.length}`,
    );
  });

  test(`${handle}: no furniture promises in wood-care copy`, () => {
    const copy = JSON.stringify(c).toLowerCase();
    for (const banned of [
      "12–16",
      "12-16",
      "white glove",
      "lifetime",
      "amish",
    ]) {
      assert.ok(!copy.includes(banned), `contains "${banned}"`);
    }
  });

  test(`${handle}: ship time matches handlingDays`, () => {
    const { min, max } = c.handlingDays;
    assert.ok(c.seoDescription.includes(`${min}–${max} business days`));
    assert.ok(
      c.faq.some((f) => f.answer.includes(`${min}–${max} business days`)),
    );
  });
}
