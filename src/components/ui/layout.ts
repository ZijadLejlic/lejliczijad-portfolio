// Shared prop types for the layout primitives (P1.DS.08).

/** A step of the spacing scale in tokens.css (`--space-1` … `--space-11`). */
export type SpaceStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Width of a Container: the page column, or a readable column for prose. */
export type ContainerWidth = 'default' | 'prose';

/** Elements a block-level primitive may render as. Lists keep their semantics (see Grid, Stack). */
export type BlockTag =
  'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main' | 'nav' | 'ul' | 'ol';

/**
 * Safari drops list semantics when `list-style: none` is set, so an unstyled list needs an
 * explicit role (reset.css also keys its list reset on it).
 */
export function listRole(tag: BlockTag): 'list' | undefined {
  return tag === 'ul' || tag === 'ol' ? 'list' : undefined;
}
