import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { cn } from '@/utils'

export function SearchBar({
  defaultValue = '',
  onSubmit,
  autoFocus = false,
  placeholder = 'Search rice, milk, notebook…',
  showAi = true,
  className,
  compact = false,
}: {
  defaultValue?: string
  onSubmit?: (value: string) => void
  autoFocus?: boolean
  placeholder?: string
  showAi?: boolean
  className?: string
  compact?: boolean
}) {
  const [value, setValue] = useState(defaultValue)
  const navigate = useNavigate()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const query = value.trim()
        if (onSubmit) onSubmit(query)
        else if (query) navigate(`/buyer/search?q=${encodeURIComponent(query)}`)
      }}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-cream-4 bg-white/90 p-1.5 pl-3 shadow-card transition-shadow focus-within:border-orange-300 focus-within:shadow-soft',
        compact && 'p-1 pl-2.5',
        className,
      )}
      role="search"
    >
      <Search className="h-4 w-4 shrink-0 text-brown-300" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Search products and shops"
        className="h-8 min-w-0 flex-1 bg-transparent text-sm text-brown-900 placeholder:text-brown-300 focus:outline-none"
      />
      {showAi && (
        <button
          type="button"
          onClick={() => navigate('/buyer/ai')}
          className="hidden items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[11px] font-medium text-orange-600 sm:inline-flex"
          title="Ask LocalizeIt AI"
        >
          <Sparkles className="h-3 w-3" />
          Ask AI
        </button>
      )}
      <button
        type="submit"
        className="inline-flex h-8 shrink-0 items-center rounded-lg bg-brown-900 px-3 text-[11px] font-medium text-cream transition-colors hover:bg-brown-800"
      >
        Search
      </button>
    </form>
  )
}

export function SearchSuggestions({
  suggestions,
  onPick,
}: {
  suggestions: string[]
  onPick: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onPick(suggestion)}
          className="inline-flex items-center gap-1 rounded-full border border-cream-4 bg-white/70 px-3 py-1.5 text-[11px] text-brown-500 transition-colors hover:border-orange-300 hover:text-orange-600"
        >
          <Search className="h-3 w-3" />
          {suggestion}
        </button>
      ))}
    </div>
  )
}
