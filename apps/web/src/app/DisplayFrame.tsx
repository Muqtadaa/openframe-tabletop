import { useEffect } from 'react'

import { Canvas } from '../canvas/Canvas.js'
import { useBoardTitle } from '../hooks/use-document-object.js'

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
 * PHASE 5: the turn order joins the Scene here, large, once initiative exists.
 * It is not drawn today because nothing produces one, and a placeholder strip
 * would be a claim the product cannot back.
 */
export function DisplayFrame() {
  const title = useBoardTitle()

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
    </div>
  )
}
