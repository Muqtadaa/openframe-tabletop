import { useEffect } from 'react'

import { Canvas } from '../canvas/Canvas.js'
import { useBoardTitle } from '../hooks/use-document-object.js'
import { useRoomStatus } from '../hooks/use-room-status.js'
import { BoardGone } from '../ui/BoardGone.js'
import { BoardLocked } from '../ui/BoardLocked.js'

/**
 * The table drawn for a shared screen: a TV or a projector at a physical table,
 * read from across the room by people who are not operating it.
 *
 * It is the Scene and nothing else. No rail, no bar, no dock and no control,
 * and the board is narrowed to view-only before it is drawn (`open-board.tsx`),
 * so a stray key or touch on the machine driving the screen cannot change the
 * game. The title is still the page's heading, hidden, so the page is not
 * nameless to a screen reader.
 *
 * It still says when the table cannot be trusted. A screen on a wall whose room
 * drops would otherwise show a frozen table with no word, so a connection that is
 * not live is said in large type, in words, and the board's own gates (gone,
 * locked) take the screen as they do everywhere.
 *
 * PHASE 5: the turn order joins the Scene here, large, once initiative exists.
 * It is not drawn today because nothing produces one, and a placeholder strip
 * would be a claim the product cannot back.
 */
export function DisplayFrame() {
  const title = useBoardTitle()
  const room = useRoomStatus()

  useEffect(() => {
    const before = window.document.title
    window.document.title = `${title} — OpenFrame Tabletop`
    return () => {
      window.document.title = before
    }
  }, [title])

  return (
    <div className="of-app of-app--display" data-testid="display-frame">
      <h1 className="of-visually-hidden">{title}</h1>
      <main className="of-board-main" aria-label="Board">
        <Canvas />
      </main>
      {room !== null &&
        room !== 'connected' &&
        room !== 'gone' &&
        room !== 'locked' &&
        room !== 'full' && (
          <p className="of-display-status" role="status" data-testid="display-status">
            {room === 'connecting'
              ? 'Reconnecting…'
              : room === 'paused'
                ? 'Shared play is paused. Showing the last table received.'
                : 'Offline. Showing the last table received.'}
          </p>
        )}
      <BoardGone />
      <BoardLocked />
    </div>
  )
}
