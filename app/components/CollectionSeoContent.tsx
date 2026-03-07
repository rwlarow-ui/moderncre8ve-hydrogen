import { collectionSeoDescriptions } from "~/utils/collection-seo-descriptions";

/**
 * Renders rich SEO content below the collection product grid.
 * This text is crawlable and helps rankings for long-tail keywords
 * without disrupting the visual design controlled by Weaverse.
 *
 * Content is only rendered for collections that have entries in
 * the collectionSeoDescriptions map.
 */
export function CollectionSeoContent({ handle }: { handle: string }) {
  const seo = collectionSeoDescriptions[handle];
  if (!seo?.rich) return null;

  return (
    <section
      className="collection-seo-content mx-auto max-w-4xl px-6 py-12 text-sm leading-relaxed text-gray-600"
      aria-label={`About this collection`}
    >
      <p>{seo.rich}</p>
    </section>
  );
}
