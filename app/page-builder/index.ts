/**
 * The storefront's page builder.
 *
 * Page compositions are TypeScript modules under `pages/`, sections are the
 * components in `~/sections` registered in `components.ts`, and the whole tree
 * is rendered by `<PageContent />` from data the route loader resolved.
 *
 * This barrel deliberately re-exports only leaf modules. `renderer` and
 * `components` are imported directly (by routes) so that a section importing
 * `~/page-builder` can never form an import cycle back through the registry.
 */
export {
  SectionContext,
  type SectionInstance,
  type SectionTree,
  SectionTreeContext,
  useChildSections,
  useParentSection,
  useSectionData,
  useSectionInstance,
} from "./context";
export { isBrowser } from "./env";
export { IMAGES_PLACEHOLDERS } from "./placeholders";
export { createSchema, generateDataFromSchema } from "./schema";
export { useThemeSettings } from "./theme";
export type {
  ComponentLoaderArgs,
  ComponentSchema,
  InputType,
  LoadedPageItem,
  PageData,
  PageDefinition,
  PageImage,
  PageItem,
  PageType,
  PageVideo,
  PickedArticle,
  PickedBlog,
  PickedCollection,
  PickedProduct,
  PositionInputValue,
  ResourcePickerData,
  RouteLoaderArgs,
  SchemaInput,
  SectionComponent,
  SectionComponentProps,
  SettingsGroup,
  ThemeSchema,
  ThemeSettings,
} from "./types";
