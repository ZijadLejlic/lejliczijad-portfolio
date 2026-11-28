// Behavior of LiteYouTube (P1.DS.20). Until the visitor clicks the play link the page holds only a
// poster and a link, so nothing is requested from YouTube (NFR-08). The click swaps the link for a
// youtube-nocookie iframe. One delegated listener per document, so it also covers pages that
// arrive through view transitions.

import {
  LITE_YOUTUBE_ALLOW,
  LITE_YOUTUBE_ID_ATTR,
  LITE_YOUTUBE_PLAY_ATTR,
  LITE_YOUTUBE_PLAY_EVENT,
  LITE_YOUTUBE_ROOT_ATTR,
  LITE_YOUTUBE_TITLE_ATTR,
  embedUrl,
  isYoutubeId,
} from './lite-youtube';

const installed = new WeakSet<Document>();
// The play link and the dialog listener of a root that is playing, so reset() can restore them.
const playing = new WeakMap<HTMLElement, { link: Element; stop: () => void }>();

/** Replaces the play link with the iframe and moves focus into it. No-op if already playing. */
export function playVideo(root: HTMLElement): void {
  if (playing.has(root)) return;
  const id = root.getAttribute(LITE_YOUTUBE_ID_ATTR) ?? '';
  const link = root.querySelector(`[${LITE_YOUTUBE_PLAY_ATTR}]`);
  if (!link || !isYoutubeId(id)) return;

  const doc = root.ownerDocument;
  const frame = doc.createElement('iframe');
  frame.className = 'lite-youtube__frame';
  frame.src = embedUrl(id);
  frame.title = root.getAttribute(LITE_YOUTUBE_TITLE_ATTR) ?? 'YouTube video';
  frame.allow = LITE_YOUTUBE_ALLOW;
  frame.allowFullscreen = true;
  // YouTube refuses to play without a referrer (error 153), so the default policy is kept explicit.
  frame.referrerPolicy = 'strict-origin-when-cross-origin';

  // A video inside a Modal must stop with it: closing the dialog puts the facade back.
  const dialog = root.closest('dialog');
  const onClose = (): void => resetVideo(root);
  dialog?.addEventListener('close', onClose);

  playing.set(root, { link, stop: () => dialog?.removeEventListener('close', onClose) });
  link.remove();
  root.dataset.state = 'playing';
  root.append(frame);
  frame.focus();
  root.dispatchEvent(new CustomEvent(LITE_YOUTUBE_PLAY_EVENT, { bubbles: true, detail: { id } }));
}

/** Removes the iframe (which stops the video) and shows the poster and play link again. */
export function resetVideo(root: HTMLElement): void {
  const state = playing.get(root);
  if (!state) return;
  playing.delete(root);
  state.stop();
  root.querySelector('iframe')?.remove();
  root.append(state.link);
  root.dataset.state = 'idle';
}

function onClick(event: MouseEvent): void {
  // Let ctrl/cmd/shift/middle clicks do what a link does (open on YouTube in a new tab).
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest(`[${LITE_YOUTUBE_PLAY_ATTR}]`);
  const root = link?.closest<HTMLElement>(`[${LITE_YOUTUBE_ROOT_ATTR}]`);
  if (!root) return;
  event.preventDefault();
  playVideo(root);
}

export function installLiteYouTube(doc: Document): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  doc.addEventListener('click', onClick);
}
