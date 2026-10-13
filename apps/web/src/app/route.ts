import { asBoardId, type BoardId } from '@openframe/core'

import { accessKey, commentAnchor, ROOM_PARAM, sharedBoardId } from './collab-config.js'

/**
 * The whole of this application's routing, still in a query string.
 *
 * Two surfaces now instead of one, which is the threshold the deferred
 * decisions table set for earning a real router — and it is not met. A router
 * buys nested routes, route-level code splitting and a history abstraction;
 * this needs none of them, and every one of them is a dependency that has to
 * be understood by whoever reads `main.tsx` next.
 *
 * Navigation is a full page load, deliberately. `createRuntime` opens exactly
 * one board and the whole application is wired around it before React renders;
 * a client-side transition would mean tearing that down and rebuilding it,
 * which is a second lifecycle for the sake of saving a reload the splash
 * already covers.
 */

/** A local board, in this browser only. `?board=<id>`. */
export const BOARD_PARAM = 'board'

/** The prep shell: the tables you can open, arranged between sessions. `?prep`. */
export const PREP_PARAM = 'prep'

/**
 * The shared-screen display of a board: the table and nothing else, for a TV or
 * a projector. `&display=1` on a board link.
 */
export const DISPLAY_PARAM = 'display'

/**
 * The shape of a local board id.
 *
 * Checked because the id reaches IndexedDB and the URL, and because a board
 * that cannot be named cannot be opened again — a malformed id would persist
 * the mistake rather than fail visibly.
 */
const LOCAL_ID = /^board_[A-Za-z0-9-]{1,48}$/

export type Route =
  /** The entry surface: sign in, or pick up a board, or start one. */
  | { readonly kind: 'home' }
  /** Preparing between sessions: persistent navigation, and the boards as a grid. */
  | { readonly kind: 'prep' }
  | {
      readonly kind: 'board'
      readonly boardId: BoardId
      readonly shared: boolean
      /**
       * Which of the board's two links this is, for a shared board.
       *
       * `null` on a link with no key — either a local board, or one shared
       * before links had roles, which the room still admits as an editor.
       */
      readonly key: string | null
      /**
       * A remark the link is pointing at, for a notification that says "come
       * and look at THIS" rather than "come and look at the board". `null`
       * for every other way of arriving.
       */
      readonly commentId: string | null
      /**
       * Drawn for a shared screen: no controls, nothing that edits. A link
       * flag and not a role, because it is the same person on the same board
       * looking at it differently (ADR T009).
       */
      readonly display: boolean
    }

export function readRoute(search: string): Route {
  const display = new URLSearchParams(search).get(DISPLAY_PARAM) === '1'
  const shared = sharedBoardId(search)
  if (shared !== null) {
    return {
      kind: 'board',
      boardId: shared,
      shared: true,
      key: accessKey(search),
      commentId: commentAnchor(search),
      display,
    }
  }

  const raw = new URLSearchParams(search).get(BOARD_PARAM)
  if (raw !== null && LOCAL_ID.test(raw)) {
    return {
      kind: 'board',
      boardId: asBoardId(raw),
      shared: false,
      key: null,
      commentId: commentAnchor(search),
      display,
    }
  }

  if (new URLSearchParams(search).has(PREP_PARAM)) return { kind: 'prep' }

  /*
   * Anything unrecognised is home rather than an error. A truncated or mangled
   * link is far more likely than a hostile one, and home is a place somebody
   * can recover from — a 404 is not.
   */
  return { kind: 'home' }
}

export function boardHref(boardId: BoardId, shared: boolean): string {
  return `/?${shared ? ROOM_PARAM : BOARD_PARAM}=${encodeURIComponent(boardId)}`
}

export const HOME_HREF = '/'

export const PREP_HREF = `/?${PREP_PARAM}`

/** A new local board. Short enough to read in a URL, unique enough to be one. */
export function newLocalBoardId(): BoardId {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  let suffix = ''
  for (const byte of bytes) suffix += alphabet.charAt(byte % alphabet.length)
  return asBoardId(`board_${suffix}`)
}
