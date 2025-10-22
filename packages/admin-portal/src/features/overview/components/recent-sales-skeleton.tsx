import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Renders a card-styled skeleton UI that represents a list of recent sales.
 *
 * The skeleton includes placeholders for a header (title and description) and five list rows,
 * each with avatar, name, email, and amount placeholders.
 *
 * @returns A JSX element containing the recent sales skeleton layout
 */
export function RecentSalesSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-6 w-[140px]" /> {/* CardTitle */}
        <Skeleton className="h-4 w-[180px]" /> {/* CardDescription */}
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="h-9 w-9 rounded-full" /> {/* Avatar */}
              <div className="ml-4 space-y-1">
                <Skeleton className="h-4 w-[120px]" /> {/* Name */}
                <Skeleton className="h-4 w-[160px]" /> {/* Email */}
              </div>
              <Skeleton className="ml-auto h-4 w-[80px]" /> {/* Amount */}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
