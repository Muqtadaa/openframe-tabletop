import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { AnchoredSurface } from '../controls/AnchoredSurface.js'
import { InboxIcon } from '../controls/icons.js'
import { useAnchoredTo } from '../controls/use-anchor.js'
import { stepFocus } from '../controls/roving.js'
import { useDismiss } from '../controls/use-dismiss.js'
import { useMentions } from '../hooks/use-mentions.js'
import { MentionItems } from './Mentions.js'
import { wrapTab } from '../controls/wrap-tab.js'

/**
 * What has happened that is for you: mentions. One count, one sheet.
 *
 * It was two kinds of news in one place — mentions, and what agents did to the
 * board — until agents left the product. What stays is the one answer to "is
 * anything waiting for me?", which other kinds of news can join.
 *
 * Absent while there is nothing in it: a control for something that has
 * never happened is a control people learn to ignore.
 */
export function Inbox() {
  const mentions = useMentions()
  const [open, setOpen] = useState(false)
  const { ref: button, anchor, surface } = useAnchoredTo<HTMLButtonElement>(open)
  const sheet = useRef<HTMLDivElement>(null)
  const mentionsHeading = useId()
  const close = useCallback(() => {
    setOpen(false)
    button.current?.focus()
  }, [button])
  useDismiss(sheet, button, close, open)

  /*
   * In once the sheet is PLACED: at its first mention, which only goes
   * somewhere, or else at the sheet itself. Never at an action that changes
   * something — opening the Inbox and pressing Enter twice must not do anything.
   */
  const placed = anchor !== null
  useEffect(() => {
    if (!open || !placed) return
    ;(sheet.current?.querySelector<HTMLElement>('a') ?? sheet.current)?.focus()
  }, [open, placed])

  if (mentions.mentions.length === 0) return null

  const waiting = mentions.unread
  const name = waiting === 0 ? 'Inbox, nothing new' : `Inbox, ${String(waiting)} new`

  return (
    <div className="of-inbox">
      <button
        ref={button}
        type="button"
        className={waiting === 0 ? 'of-mentions__bell is-read' : 'of-mentions__bell'}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={name}
        data-tip={name}
        data-testid="inbox"
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        <InboxIcon
          className={waiting > 0 ? 'of-inbox__icon of-inbox__icon--news' : 'of-inbox__icon'}
        />
        <span className="of-inbox__word">Inbox</span>
        {waiting > 0 && (
          <span className="of-inbox__count" aria-hidden="true">
            {waiting}
          </span>
        )}
      </button>

      {open && (
        <AnchoredSurface
          anchor={anchor}
          surface={surface}
          prefer={['below', 'above']}
          testId="inbox-surface"
        >
          <div
            ref={sheet}
            className="of-inbox__sheet"
            role="dialog"
            aria-label="Inbox"
            tabIndex={-1}
            onKeyDown={(event) => {
              wrapTab(event)
              /*
               * Up and down everything in it, wrapping, as every list here
               * does — and the board does not see the press: it read the
               * arrows as a nudge to the note selected underneath.
               */
              stepFocus(event, { items: 'a, button' })
            }}
          >
            {mentions.mentions.length > 0 && (
              <section aria-labelledby={mentionsHeading}>
                <h2 className="of-inbox__heading" id={mentionsHeading}>
                  Mentions
                </h2>
                <MentionItems
                  mentions={mentions.mentions}
                  keyFor={mentions.keyFor}
                  markRead={mentions.markRead}
                  onFollowed={() => {
                    setOpen(false)
                  }}
                />
              </section>
            )}
          </div>
        </AnchoredSurface>
      )}
    </div>
  )
}
