import { formatKeys } from '../../scene/shortcuts.js'
import { docksFor, type DockDefinition } from './docks.js'
import { usePosture } from './posture.js'

/**
 * The rail along the right edge that opens a dock. Closed by default, so the
 * Scene keeps the screen; there is nothing here for a posture that is offered
 * no dock, and then no rail at all.
 */
export function DockRail({ docks }: { readonly docks?: readonly DockDefinition[] }) {
  const posture = usePosture()
  const offered = docksFor(posture, docks)
  if (offered.length === 0) return null
  return (
    <div className="of-overlay of-overlay--dock" data-keep-clear="right">
      <div className="of-dock-rail" role="group" aria-label="Docks" data-testid="dock-rail">
        {offered.map((dock) => (
          <DockButton key={dock.id} dock={dock} />
        ))}
      </div>
    </div>
  )
}

function DockButton({ dock }: { readonly dock: DockDefinition }) {
  const open = dock.useOpen()
  const tip = `${dock.label} (${formatKeys(dock.keys)})`
  return (
    <button
      type="button"
      className="of-icon-button of-dock-rail__button"
      aria-pressed={open}
      aria-label={dock.label}
      data-tip={tip}
      aria-description={tip}
      data-testid={`dock-${dock.id}`}
      data-dock-trigger
      onClick={dock.toggle}
    >
      {dock.icon()}
    </button>
  )
}
