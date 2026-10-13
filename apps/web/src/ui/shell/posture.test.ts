import { describe, expect, it } from 'vitest'

import { postureOf } from './posture.js'

/**
 * Where a person sits decides what is offered, never what is allowed. The
 * mapping is small and everything downstream reads it, so it is pinned.
 */
describe('posture', () => {
  it('lets whoever owns the table run it, including a table that is this browser’s own', () => {
    expect(postureOf('owner', false)).toBe('gm')
    expect(postureOf(null, false)).toBe('gm')
  })

  it('seats an editor as a player and a viewer as a spectator', () => {
    expect(postureOf('editor', false)).toBe('player')
    expect(postureOf('viewer', false)).toBe('spectator')
  })

  it('reads a board that cannot be changed as a spectator whatever the role says', () => {
    expect(postureOf('owner', true)).toBe('spectator')
    expect(postureOf(null, true)).toBe('spectator')
    expect(postureOf('editor', true)).toBe('spectator')
  })
})
