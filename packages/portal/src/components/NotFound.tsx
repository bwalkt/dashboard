import { Link } from '@tanstack/react-router'
import { AlertCircle, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 py-12 text-center">
        <div className="mb-8">
          <AlertCircle className="mx-auto h-24 w-24 text-muted-foreground" />
        </div>

        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>

        <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>

        <p className="text-muted-foreground mb-8">
          Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or never
          existed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Link>
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            If you believe this is a mistake, please{' '}
            <Link to="/support" className="text-primary hover:underline">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
