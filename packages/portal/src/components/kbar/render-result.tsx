import { KBarResults, useMatches } from 'kbar'
import ResultItem from './result-item'

/**
 * RenderResults component that displays KBar search results with section headers and action items.
 *
 * Uses matches from the KBar hook to render string items as styled section headers and non-string items
 * as ResultItem components, supplying the active state and the current root action id (falls back to an empty string).
 *
 * @returns A JSX element rendering the KBarResults list with section headers for string items and ResultItem components for action items
 */
export default function RenderResults() {
  const { results, rootActionId } = useMatches()

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="text-primary-foreground px-4 py-1 text-sm uppercase opacity-50">{item}</div>
        ) : (
          <ResultItem action={item} active={active} currentRootActionId={rootActionId ?? ''} />
        )
      }
    />
  )
}
