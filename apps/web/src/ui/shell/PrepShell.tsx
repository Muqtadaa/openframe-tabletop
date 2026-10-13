import { useEffect, useState } from 'react'

import { canPrep, describeWhen, openHref } from '../../app/board-rows.js'
import { boardHref, HOME_HREF } from '../../app/route.js'
import { abandonSplash } from '../../app/splash.js'
import { useIdentity } from '../../hooks/use-identity.js'
import type { ListedBoard } from '../../runtime/services.js'
import { ShareFailed, useServices } from '../../runtime/services.js'
import { describeStartFailure } from '../StartFailed.js'
import { ThemeToggle } from '../ThemeToggle.js'
import { PREP_SECTIONS } from './prep-sections.js'

/**
 * Preparing between sessions: persistent navigation on the left, the tables you
 * run as a grid on the right.
 *
 * Persistent navigation is legitimate HERE and nowhere at the table, because
 * the job is moving between things (ADR T009). It is over Board data and says
 * so in the nouns it uses: a board is a Scene only once the Game above it
 * exists (PHASE 1, T001), so nothing here claims a campaign, a cast or an
 * encounter. Sections that do not exist are not listed.
 */
export function PrepShell() {
  const services = useServices()
  const identity = useIdentity()
  const [problem, setProblem] = useState<string | null>(null)
  const [listing, setListing] = useState<{
    readonly boards: readonly ListedBoard[]
    readonly readAt: number
  } | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void services.boards.listAll(identity !== null).then(
      (found) => {
        if (!live) return
        setListing({ boards: found, readAt: Date.now() })
        setProblem(null)
      },
      (error: unknown) => {
        if (!live) return
        abandonSplash()
        setProblem(describeStartFailure(error))
      },
    )
    return () => {
      live = false
    }
  }, [services, identity])

  const canStart = !services.accounts.enabled || identity !== null
  const start = (): void => {
    setStarting(true)
    setStartError(null)
    const created = services.accounts.enabled
      ? services.boards.createOwned().then((board) => board.editLink)
      : services.boards.createLocal().then((boardId) => boardHref(boardId, false))
    void created.then(
      (href) => {
        window.location.assign(href)
      },
      (error: unknown) => {
        setStarting(false)
        setStartError(
          error instanceof ShareFailed ? error.message : 'A new scene needs a connection.',
        )
      },
    )
  }

  // Preparing is the runner's work: a board somebody else owns is theirs to prepare.
  const mine = (listing?.boards ?? []).filter(canPrep)

  return (
    <div className="of-prep" data-testid="prep">
      <nav className="of-prep__nav" aria-label="Prep">
        <p className="of-prep__name">Prep</p>
        <ul className="of-prep__sections">
          {PREP_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                className="of-prep__section"
                href={`#${section.id}`}
                aria-current="page"
                data-testid={`prep-section-${section.id}`}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="of-prep__foot">
          <a className="of-prep__back" href={HOME_HREF} data-testid="prep-back">
            Back to library
          </a>
          <ThemeToggle className="of-icon-button" />
        </div>
      </nav>

      <main className="of-prep__main" id="scenes">
        <header className="of-prep__head">
          <h1 className="of-prep__title">Scenes</h1>
          {canStart && (
            <button
              type="button"
              className="of-button of-button--primary"
              data-testid="prep-create"
              disabled={starting}
              onClick={start}
            >
              Create scene
            </button>
          )}
        </header>

        {startError !== null && (
          <p className="of-home__row-problem" role="alert">
            {startError}
          </p>
        )}

        {problem !== null ? (
          <p className="of-home__row-problem" role="alert" data-testid="prep-problem">
            Your scenes could not be listed. {problem}
          </p>
        ) : listing === null ? (
          <p className="of-prep__note">Looking for your scenes…</p>
        ) : mine.length === 0 ? (
          <p className="of-prep__note" data-testid="prep-empty">
            No scenes yet.
          </p>
        ) : (
          <ul className="of-prep__grid" data-testid="prep-scenes">
            {mine.map((board) => (
              <li key={board.boardId}>
                <a className="of-prep__scene" href={openHref(board)} data-testid="prep-scene">
                  <span className="of-prep__scene-name">{board.title}</span>
                  <span className="of-prep__scene-when">
                    {describeWhen(board.updatedAt, listing.readAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
