import { ArrowRightIcon } from "@phosphor-icons/react";
import type { Collection } from "@shopify/hydrogen/storefront-api-types";
import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { Image } from "~/components/image";
import { Link } from "~/components/link";
import type { ImageAspectRatio } from "~/types/image";
import { getCollectionDisplayTitle } from "~/utils/collection-list";
import { calculateAspectRatio } from "~/utils/image";

interface CollectionCardProps {
  collection: Collection;
  imageAspectRatio: ImageAspectRatio;
  collectionNameColor: string;
  ctaText?: string;
  loading?: HTMLImageElement["loading"];
}

export function CollectionCard({
  collection,
  imageAspectRatio,
  collectionNameColor,
  ctaText = "Shop the collection",
  loading,
}: CollectionCardProps) {
  if (collection.products.nodes.length === 0) {
    return null;
  }

  let collectionImage = collection.image;
  if (!collectionImage) {
    const firstProductMedia =
      collection.products.nodes[0]?.media.nodes[0]?.previewImage;
    if (firstProductMedia) {
      collectionImage = firstProductMedia;
    }
  }
  const title = getCollectionDisplayTitle(collection.title);

  return (
    <Link
      to={`/collections/${collection.handle}`}
      className={clsx(
        "group relative flex flex-col",
        "focus-visible:outline-2 focus-visible:outline-[#323640] focus-visible:outline-offset-4",
      )}
      style={
        {
          "--aspect-ratio": calculateAspectRatio(
            collectionImage,
            imageAspectRatio,
          ),
          color: collectionNameColor || "#fff",
        } as CSSProperties
      }
    >
      <div className="relative flex aspect-(--aspect-ratio) items-end overflow-hidden bg-[#F2EBD5]">
        {collectionImage ? (
          <Image
            data={{
              ...collectionImage,
              altText: collectionImage.altText || title,
            }}
            width={collectionImage.width || 600}
            height={collectionImage.height || 400}
            sizes="(max-width: 48em) 50vw, 33vw"
            loading={loading}
            className={clsx(
              "absolute inset-0 z-0 h-full w-full object-cover",
              "transition-transform duration-500 ease-out group-hover:scale-[1.03]",
              "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            )}
          />
        ) : null}
        {/* Bottom scrim keeps the label at WCAG AA contrast on any photo,
            including the light, white-wall shots most collections use. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
        />
        <div className="relative z-1 flex w-full flex-col gap-1 p-4 md:p-5">
          <span className="font-medium font-sans text-lg uppercase leading-tight tracking-wide md:text-xl">
            {title}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="border-transparent border-b group-hover:border-current">
              {ctaText}
            </span>
            <ArrowRightIcon
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
