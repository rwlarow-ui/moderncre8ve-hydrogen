import assert from "node:assert/strict";
import test from "node:test";
import {
  cartLineMerchandiseIds,
  REQUEST_ONLY_CART_MESSAGE,
  requestOnlyMerchandise,
} from "../app/utils/product-class.ts";

const V = (n) => `gid://shopify/ProductVariant/${n}`;

test("collects distinct merchandise IDs from cart line inputs", () => {
  assert.deepEqual(
    cartLineMerchandiseIds([
      { merchandiseId: V(1), quantity: 1 },
      { merchandiseId: V(2), quantity: 2 },
      { merchandiseId: V(1), quantity: 1 },
    ]),
    [V(1), V(2)],
  );
});

test("quantity-only line updates carry no merchandise to check", () => {
  assert.deepEqual(
    cartLineMerchandiseIds([{ id: "gid://shopify/CartLine/1", quantity: 3 }]),
    [],
  );
  assert.deepEqual(cartLineMerchandiseIds(undefined), []);
  assert.deepEqual(cartLineMerchandiseIds("nope"), []);
  assert.deepEqual(cartLineMerchandiseIds([null, { merchandiseId: 5 }]), []);
});

test("blocks a variant whose product is tagged request-only", () => {
  assert.deepEqual(
    requestOnlyMerchandise(
      [V(1)],
      [{ product: { handle: "warwick-bed", tags: ["Beds", "request-only"] } }],
    ),
    [{ merchandiseId: V(1), handle: "warwick-bed" }],
  );
});

test("tag match is case- and whitespace-insensitive", () => {
  assert.equal(
    requestOnlyMerchandise(
      [V(1)],
      [{ product: { handle: "haven-credenza", tags: [" Request-Only "] } }],
    ).length,
    1,
  );
});

test("in a mixed request only the request-only line is reported", () => {
  assert.deepEqual(
    requestOnlyMerchandise(
      [V(1), V(2), V(3)],
      [
        { product: { handle: "santa-monica-table", tags: ["Dining"] } },
        { product: { handle: "vermonter-bench", tags: ["request-only"] } },
        { product: { handle: "lareauxs-furniture-wax", tags: [] } },
      ],
    ),
    [{ merchandiseId: V(2), handle: "vermonter-bench" }],
  );
});

test("ordinary products, unknown IDs and missing data are not blocked", () => {
  assert.deepEqual(
    requestOnlyMerchandise(
      [V(1), V(2), V(3)],
      [
        { product: { handle: "a", tags: ["request"] } },
        null,
        { product: null },
      ],
    ),
    [],
  );
  assert.deepEqual(requestOnlyMerchandise([V(1)], null), []);
  assert.deepEqual(requestOnlyMerchandise([], []), []);
});

test("the refusal points the buyer to the request form", () => {
  assert.match(REQUEST_ONLY_CART_MESSAGE, /request only/i);
  assert.match(REQUEST_ONLY_CART_MESSAGE, /Request this piece/);
});
