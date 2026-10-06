import { useDeferredValue, useMemo, useState } from 'react'
import { Copy, ImageOff, Moon, Search, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Toaster } from '@/components/ui/sonner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import images from './images.json'

type Source = 'all' | 'local' | 'remote'
const SIZES = ["16", "24", "32", "48+"]
const bucket = (i: { w?: number; h?: number }) => {
  const m = Math.max(i.w ?? 0, i.h ?? 0)
  return !m ? "?" : m >= 48 ? "48+" : String(m)
}
type Item = (typeof images)[number]

function Tile({ item }: { item: Item }) {
  const [broken, setBroken] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(item.id)
    toast.success('Copied', { description: item.id })
  }
  return (
    <button
      onClick={copy}
      title={item.file}
      className="group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex h-20 w-full items-center justify-center rounded-lg bg-[conic-gradient(#0000000d_25%,#0000_0_50%,#0000000d_0_75%,#0000_0)] bg-[length:12px_12px] dark:bg-[conic-gradient(#ffffff12_25%,#0000_0_50%,#ffffff12_0_75%,#0000_0)]">
        {broken ? (
          <ImageOff className="size-6 text-muted-foreground" />
        ) : (
          <img
            src={item.url}
            alt={item.id}
            loading="lazy"
            onError={() => setBroken(true)}
            className="max-h-16 max-w-full object-contain"
          />
        )}
      </div>
      <span className="w-full truncate text-center text-xs font-medium">{item.id}</span>
      {item.w && <span className="text-[10px] text-muted-foreground">{item.w}×{item.h}</span>}
      <Copy className="absolute right-2 top-2 size-3.5 opacity-0 transition group-hover:opacity-60" />
      {item.local && <span className="absolute left-2 top-2 size-1.5 rounded-full bg-emerald-500" title="local" />}
    </button>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<Source>('all')
  const { resolvedTheme, setTheme } = useTheme()
  const [sizes, setSizes] = useState<string[]>([])
  const deferred = useDeferredValue(query)

  const shown = useMemo(() => {
    const terms = deferred.toLowerCase().split(/\s+/).filter(Boolean)
    return images.filter(
      (i) =>
        (source === 'all' || (source === 'local') === i.local) &&
        (!sizes.length || sizes.includes(bucket(i))) &&
        terms.every((t) => i.id.toLowerCase().includes(t)),
    )
  }, [deferred, source, sizes])

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/60 to-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-4">
          <h1 className="mr-2 text-lg font-semibold tracking-tight">Silwane Icon Finder</h1>
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by id…" className="pl-9" />
          </div>
          <ToggleGroup variant="outline" value={[source]} onValueChange={(v) => v[0] && setSource(v[0] as Source)}>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="local">Local</ToggleGroupItem>
            <ToggleGroupItem value="remote">Remote</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup variant="outline" multiple value={sizes} onValueChange={setSizes} aria-label="Size filter">
            {SIZES.map((s) => <ToggleGroupItem key={s} value={s}>{s}</ToggleGroupItem>)}
          </ToggleGroup>
          <Badge variant="secondary">{shown.length} / {images.length}</Badge>
          <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        {shown.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {shown.map((i) => <Tile key={i.id} item={i} />)}
          </div>
        ) : (
          <p className="py-24 text-center text-muted-foreground">No images match “{query}”.</p>
        )}
      </main>
      <Toaster position="bottom-center" />
    </div>
  )
}
