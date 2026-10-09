import { MEDIA_FRAGMENT, PRODUCT_OPTION_FRAGMENT } from "~/graphql/fragments";

export const PRODUCT_QUERY = `#graphql
  query product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      vendor
      handle
      publishedAt
      descriptionHtml
      description
      summary: description(truncateAt: 200)
      encodedVariantExistence
      encodedVariantAvailability
      tags
      featuredImage {
        id
        url
        altText
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      badges: metafields(identifiers: [
        { namespace: "custom", key: "best_seller" }
      ]) {
        key
        namespace
        value
      }
      # Shopify category metafields (standard taxonomy attributes). Keep in
      # sync with PRODUCT_SPEC_DEFINITIONS in app/utils/product-specs.ts.
      category {
        name
      }
      specs: metafields(identifiers: [
        { namespace: "shopify", key: "furniture-fixture-material" }
        { namespace: "shopify", key: "tabletop-material" }
        { namespace: "shopify", key: "top-material" }
        { namespace: "shopify", key: "frame-material" }
        { namespace: "shopify", key: "leg-material" }
        { namespace: "shopify", key: "lumber-wood-type" }
        { namespace: "shopify", key: "wood-finish" }
        { namespace: "shopify", key: "color-pattern" }
        { namespace: "shopify", key: "tabletop-color" }
        { namespace: "shopify", key: "top-color" }
        { namespace: "shopify", key: "frame-color" }
        { namespace: "shopify", key: "leg-color" }
        { namespace: "shopify", key: "extension-mechanism" }
        { namespace: "shopify", key: "table-base-type" }
        { namespace: "shopify", key: "bedding-size" }
        { namespace: "shopify", key: "compatible-mattress-size" }
        { namespace: "shopify", key: "headboard-style" }
        { namespace: "shopify", key: "bed-frame-features" }
        { namespace: "shopify", key: "furniture-fixture-features" }
        { namespace: "shopify", key: "seat-type" }
        { namespace: "shopify", key: "backrest-type" }
        { namespace: "shopify", key: "back-type" }
        { namespace: "shopify", key: "door-type" }
        { namespace: "shopify", key: "door-material" }
      ]) {
        key
        namespace
        references(first: 10) {
          nodes {
            ... on Metaobject {
              handle
              label: field(key: "label") {
                value
              }
            }
          }
        }
      }
      options {
        ...ProductOption
      }
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...ProductVariant
      }
      adjacentVariants(selectedOptions: $selectedOptions) {
        ...ProductVariant
      }
      # Check if the product is a bundle
      isBundle: selectedOrFirstAvailableVariant(ignoreUnknownOptions: true, selectedOptions: { name: "", value: ""}) {
        ...on ProductVariant {
          requiresComponents
          components(first: 100) {
             nodes {
                productVariant {
                  ...ProductVariant
                }
                quantity
             }
          }
          groupedBy(first: 100) {
            nodes {
                id
              }
            }
          }
      }
      media(first: 50) {
        nodes {
          ...Media
        }
      }
      sellingPlanGroups(first: 10) {
        edges {
          node {
            name
            sellingPlans(first: 20) {
              edges {
                node {
                  id
                  name
                  description
                  recurringDeliveries
                  options {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
      seo {
        description
        title
      }
    }
    shop {
      name
      primaryDomain {
        url
      }
      shippingPolicy {
        body
        handle
      }
      refundPolicy {
        body
        handle
      }
    }
  }
  ${MEDIA_FRAGMENT}
  ${PRODUCT_OPTION_FRAGMENT}
` as const;
