import type { ProductCardFragment } from "storefront-api.generated";
import { BreadCrumb } from "~/components/breadcrumb";
import Link from "~/components/link";
import { ProductCard } from "~/components/product/product-card";
import { Section } from "~/components/section";
import { Swimlane } from "~/components/swimlane";
import type { HeldProduct } from "~/data/held-products";

/** What the product route throws (as 404 data) for a held catalog-rollout handle. */
export interface HeldProductNotFound {
  type: "product";
  held: HeldProduct & { handle: string };
  livePieces: ProductCardFragment[];
}

export function isHeldProductNotFound(
  value: unknown,
): value is HeldProductNotFound {
  return Boolean(
    value &&
      typeof value === "object" &&
      "held" in value &&
      (value as HeldProductNotFound).held?.handle,
  );
}

/**
 * Friendly 404 for a product that is temporarily off the storefront during
 * the catalog rollout. The status stays 404 (and the page is noindex); this
 * only names the piece and points at its collection and a few live pieces.
 */
export function HeldProductNotice({ held, livePieces }: HeldProductNotFound) {
  const { name, collection } = held;
  return (
    <Section width="fixed" verticalPadding="medium">
      <div className="space-y-4 py-20" data-test="held-product-notice">
        <BreadCrumb className="justify-center" page={name} />
        <h1 className="mt-4 mb-2.5 text-center font-medium text-2xl">
          This piece is being refreshed
        </h1>
        <p className="mx-auto pt-1 text-center lg:w-1/2">
          <span className="font-medium">{name}</span> is handcrafted to order
          and is briefly off the site while we update it — back soon.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 pt-8 md:flex-row">
          <Link
            variant="outline"
            to={`/collections/${collection.handle}`}
            className="uppercase"
          >
            Browse {collection.title}
          </Link>
          <span>Or</span>
          <Link variant="underline" to="/products" className="uppercase">
            Shop all pieces
          </Link>
        </div>
      </div>
      {livePieces.length > 0 && (
        <div className="space-y-8 pt-10">
          <h2 className="font-medium text-xl">Available to order now</h2>
          <Swimlane>
            {livePieces.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-80 snap-start"
              />
            ))}
          </Swimlane>
        </div>
      )}
    </Section>
  );
}
