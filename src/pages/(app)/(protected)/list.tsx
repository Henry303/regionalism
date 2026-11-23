import { List } from 'lucide-react'

export default function PinListPlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <List className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Pin list</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Searchable regionalisms arrive in milestone 3.
        </p>
      </div>
    </div>
  )
}
