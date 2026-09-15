import { createContext, useContext } from "react";

/** A page item after schema defaults, saved data and loader data are merged. */
export type SectionInstance = {
  id: string;
  type: string;
  parentId: string;
  /** The merged props the section is rendered with. */
  data: Record<string, any>;
  children: { id: string }[];
};

export type SectionTree = Map<string, SectionInstance>;

export const SectionTreeContext = createContext<SectionTree | null>(null);
SectionTreeContext.displayName = "SectionTreeContext";

export const SectionContext = createContext<{
  id: string;
  parentId: string;
} | null>(null);
SectionContext.displayName = "SectionContext";

/**
 * The instance for `id`, or — when `id` is omitted — the section currently
 * being rendered.
 */
export function useSectionInstance(id?: string): SectionInstance | null {
  const tree = useContext(SectionTreeContext);
  const current = useContext(SectionContext);
  const target = id || current?.id;
  if (!tree || !target) {
    return null;
  }
  return tree.get(target) ?? null;
}

/** The instance of the section that contains the one being rendered. */
export function useParentSection(): SectionInstance | null {
  const tree = useContext(SectionTreeContext);
  const current = useContext(SectionContext);
  if (!tree || !current?.parentId) {
    return null;
  }
  return tree.get(current.parentId) ?? null;
}

/** Instances of the direct children of `id`, or of the current section. */
export function useChildSections(id?: string): SectionInstance[] {
  const tree = useContext(SectionTreeContext);
  const instance = useSectionInstance(id);
  if (!tree || !instance) {
    return [];
  }
  return instance.children
    .map(({ id: childId }) => tree.get(childId))
    .filter((child): child is SectionInstance => Boolean(child));
}

/**
 * The merged data of the enclosing section.
 *
 * Lets a plain component nested inside a section (one that is not itself a page
 * item, e.g. `Filters` inside `collection-filters`) read that section's
 * settings without them being threaded through as props.
 */
export function useSectionData<T = Record<string, any>>(): T {
  return (useSectionInstance()?.data ?? {}) as T;
}
