import type { AppLoadContext } from "@shopify/remix-oxygen";
import type { JSX } from "react";

/* -------------------------------------------------------------------------- */
/* Page data                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The page types a section can be enabled on. Mirrors the route templates we
 * render: a concrete page handle, or one of the resource templates.
 */
export type PageType =
  | "INDEX"
  | "PAGE"
  | "PRODUCT"
  | "COLLECTION"
  | "COLLECTION_LIST"
  | "ALL_PRODUCTS"
  | "BLOG"
  | "ARTICLE"
  | "SEARCH"
  | "CUSTOM";

/** A single node in a page tree. `children` references other items by id. */
export type PageItem = {
  id: string;
  type: string;
  data?: Record<string, any>;
  children?: { id: string }[];
};

/**
 * A page composition: a flat list of items resolved from `rootId`. Authored as
 * a typed module under `app/page-builder/pages/`.
 */
export type PageDefinition = {
  rootId: string;
  items: PageItem[];
};

/** A page item after its component `loader` has run on the server. */
export type LoadedPageItem = PageItem & { loaderData?: unknown };

/** What a route loader hands to `<PageContent />` via `pageData`. */
export type PageData = {
  rootId: string;
  items: LoadedPageItem[];
};

/* -------------------------------------------------------------------------- */
/* Component contract                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Props every section receives. Schema defaults are merged under the page
 * item's saved `data`, then spread as individual props.
 */
export interface SectionComponentProps<L = any> {
  children?: JSX.Element[];
  className?: string;
  loaderData?: L;
  "data-section-id"?: string;
  "data-section-type"?: string;
}

/** Args passed to a section's server-side `loader`. */
export type ComponentLoaderArgs<T = any> = {
  data: T;
  context: AppLoadContext;
  request: Request;
};

/** A route loader that has the page-builder client on its context. */
export interface RouteLoaderArgs {
  request: Request;
  params: Record<string, string | undefined>;
  context: AppLoadContext;
}

/** A registered section module: `default` export plus `schema`, and optionally `loader`. */
export type SectionComponent = {
  default: React.ForwardRefExoticComponent<any> | ((props: any) => JSX.Element);
  schema: ComponentSchema;
  loader?: (args: ComponentLoaderArgs) => Promise<unknown>;
};

/* -------------------------------------------------------------------------- */
/* Resource picker values                                                      */
/* -------------------------------------------------------------------------- */

export type ResourcePickerData = { id: number; handle: string };
export type PickedProduct = ResourcePickerData;
export type PickedCollection = ResourcePickerData;
export type PickedBlog = ResourcePickerData;
export type PickedArticle = ResourcePickerData;

export type PageImage = {
  id: string;
  url: string;
  altText: string;
  width: number;
  height: number;
  previewSrc: string;
};

export type PageVideo = PageImage;

export type PositionInputValue =
  | "top left"
  | "top center"
  | "top right"
  | "center left"
  | "center center"
  | "center right"
  | "bottom left"
  | "bottom center"
  | "bottom right";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export type InputType =
  | "blog"
  | "collection"
  | "collection-list"
  | "color"
  | "datepicker"
  | "heading"
  | "image"
  | "map-autocomplete"
  | "metaobject"
  | "position"
  | "product"
  | "product-list"
  | "range"
  | "richtext"
  | "select"
  | "switch"
  | "text"
  | "textarea"
  | "toggle-group"
  | "url"
  | "video";

export type SchemaInput = {
  type: InputType;
  name?: string;
  label?: string;
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
  configs?: Record<string, any>;
  condition?: string | ((data: any) => boolean);
  [key: string]: any;
};

/** A labelled group of inputs. Kept as the settings vocabulary for sections. */
export type SettingsGroup = {
  group: string;
  inputs: SchemaInput[];
};

export type ComponentSchema = {
  type: string;
  title: string;
  settings?: SettingsGroup[];
  childTypes?: string[];
  presets?: Record<string, any>;
  limit?: number;
  enabledOn?: { pages?: (PageType | string)[] };
};

export type ThemeSchema = {
  info: Record<string, any>;
  i18n?: Record<string, any>;
  settings: SettingsGroup[];
};

export type ThemeSettings = Record<string, any>;
