import { describe, expect, it } from 'vitest'
import { filterHelpTopics, findHelpTopic, HELP_TOPICS } from './helpContent'

describe('helpContent', () => {
  it('matches keywords case-insensitively', () => {
    const matches = filterHelpTopics('MaRk PaId')
    expect(matches.some((topic) => topic.id === 'how-mark-paid-works')).toBe(true)
  })

  it('matches article body content', () => {
    const matches = filterHelpTopics('income-entries')
    expect(matches.some((topic) => topic.id === 'unknown-route-404')).toBe(true)
  })

  it('finds a topic by id', () => {
    expect(findHelpTopic('projected-cash-flow')?.title).toMatch(/projected cash flow/i)
    expect(HELP_TOPICS.length).toBeGreaterThan(15)
  })
})
