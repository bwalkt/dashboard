import { Button } from '@/components/ui/button'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Button
        className="fixed left-1.5 top-1.5 z-[100] -translate-y-12 opacity-0 transition-all focus-visible:translate-y-0 focus-visible:opacity-100"
        asChild
      >
        <a id="skip-to-content" href="#content">
          Skip to content
        </a>
      </Button>
      {children}
    </>
  )
}
