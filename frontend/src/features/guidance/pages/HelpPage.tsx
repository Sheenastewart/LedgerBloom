import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  HELP_CATEGORIES,
  filterHelpTopics,
  findHelpTopic,
  type HelpTopic,
} from '../helpContent'
import '../help.css'

function TopicArticle({
  topic,
  defaultOpen,
}: {
  topic: HelpTopic
  defaultOpen: boolean
}) {
  const panelId = useId()
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen, topic.id])

  return (
    <article className="help-article" id={topic.id}>
      <h3>
        <button
          type="button"
          className="help-article-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
        >
          {topic.title}
        </button>
      </h3>
      <p className="help-article-summary">{topic.summary}</p>
      {open ? (
        <div id={panelId} className="help-article-body">
          {topic.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {topic.relatedPath && topic.relatedLabel ? (
            <p>
              <Link to={topic.relatedPath}>{topic.relatedLabel}</Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div id={panelId} hidden />
      )}
    </article>
  )
}

export function HelpPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const topicParam = searchParams.get('topic') ?? ''
  const queryParam = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(queryParam)

  useEffect(() => {
    setQuery(queryParam)
  }, [queryParam])

  useEffect(() => {
    if (!topicParam) {
      return
    }
    const match = findHelpTopic(topicParam)
    if (!match) {
      return
    }
    const el = document.getElementById(match.id)
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [topicParam])

  const filtered = useMemo(() => filterHelpTopics(query), [query])

  function handleSearchChange(value: string) {
    setQuery(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) {
      next.set('q', value)
    } else {
      next.delete('q')
    }
    setSearchParams(next, { replace: true })
  }

  function clearSearch() {
    setQuery('')
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    setSearchParams(next, { replace: true })
  }

  return (
    <main className="help-page page">
      <div className="page-header">
        <div>
          <h1>Help</h1>
          <p className="page-subtitle">
            Search plain-language guides for LedgerBloom features, calculations, and common
            questions.
          </p>
        </div>
      </div>

      <div className="help-search">
        <label htmlFor="help-search-input">Search help</label>
        <div className="help-search-row">
          <input
            id="help-search-input"
            type="search"
            value={query}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Try projected income, Mark Paid, CSV…"
            autoComplete="off"
          />
          {query ? (
            <button type="button" className="button button-secondary" onClick={clearSearch}>
              Clear
            </button>
          ) : null}
        </div>
        <p className="help-result-count" role="status" aria-live="polite">
          {filtered.length === 1
            ? '1 article'
            : `${filtered.length} articles`}
          {query.trim() ? ` matching “${query.trim()}”` : ' available'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="status-panel" role="status">
          <p>No help articles match your search.</p>
          <button type="button" className="button button-secondary" onClick={clearSearch}>
            Clear search
          </button>
        </div>
      ) : (
        HELP_CATEGORIES.map((category) => {
          const topics = filtered.filter((topic) => topic.categoryId === category.id)
          if (topics.length === 0) {
            return null
          }
          return (
            <section
              key={category.id}
              className="help-category"
              aria-labelledby={`help-cat-${category.id}`}
            >
              <h2 id={`help-cat-${category.id}`}>{category.title}</h2>
              <p className="help-category-intro">{category.introduction}</p>
              <div className="help-article-list">
                {topics.map((topic) => (
                  <TopicArticle
                    key={topic.id}
                    topic={topic}
                    defaultOpen={topicParam === topic.id || Boolean(query.trim())}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}
    </main>
  )
}
