import { createSchema, type HydrogenComponentProps } from "@weaverse/hydrogen";
import type { WeaverseImage } from "@weaverse/hydrogen";
import { forwardRef, useState } from "react";

interface CustomerGalleryItemProps extends HydrogenComponentProps {
  image?: WeaverseImage;
  caption: string;
  customerName: string;
  productUrl?: string;
}

const CustomerGalleryItem = forwardRef<HTMLDivElement, CustomerGalleryItemProps>(
  (props, ref) => {
    const {
      image,
      caption = "Customer photo",
      customerName = "",
      productUrl = "",
      ...rest
    } = props;
    const [isHovered, setIsHovered] = useState(false);

    const imageUrl =
      typeof image === "object" && image?.url
        ? image.url
        : typeof image === "string"
          ? image
          : "";

    return (
      <div
        ref={ref}
        {...rest}
        className="group relative aspect-square cursor-pointer overflow-hidden bg-[#F0EFED]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={caption}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9DA0A7"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-4 transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <p className="font-sans text-sm font-medium text-white">{caption}</p>
          {customerName && (
            <p className="font-serif text-xs text-white/80">{customerName}</p>
          )}
        </div>

        {/* Product link */}
        {productUrl && (
          <a
            href={productUrl}
            className="absolute inset-0"
            aria-label={`View ${caption}`}
          />
        )}
      </div>
    );
  },
);

export default CustomerGalleryItem;

export const schema = createSchema({
  type: "customer-gallery-item",
  title: "Gallery Photo",
  limit: 12,
  settings: [
    {
      group: "Photo",
      inputs: [
        {
          type: "image",
          name: "image",
          label: "Customer photo",
        },
        {
          type: "text",
          name: "caption",
          label: "Caption / product name",
          defaultValue: "Customer photo",
          placeholder: "e.g. Mid-Century Walnut Credenza",
        },
        {
          type: "text",
          name: "customerName",
          label: "Customer name & location",
          defaultValue: "",
          placeholder: "e.g. Sarah M., Chicago",
        },
        {
          type: "text",
          name: "productUrl",
          label: "Link to product (optional)",
          placeholder: "/products/walnut-credenza",
        },
      ],
    },
  ],
  presets: {
    caption: "Customer photo",
    customerName: "",
  },
});
