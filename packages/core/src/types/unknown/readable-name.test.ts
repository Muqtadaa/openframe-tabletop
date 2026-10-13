import { describe, expect, it } from 'vitest'

import { readableTypeName } from './definition.js'

describe('a type from a newer version, named in words', () => {
  it.each([
    ['kanban-card', 'Kanban card'],
    ['kanban_card', 'Kanban card'],
    ['kanbanCard', 'Kanban card'],
    ['journey-stage', 'Journey stage'],
    ['', 'Object'],
    ['--', 'Object'],
  ])('%j reads as %j', (type, name) => {
    expect(readableTypeName(type)).toBe(name)
  })
})
