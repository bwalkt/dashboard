import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoGenerateOrders } from '@/hooks/use-auto-generate-orders'

/**
 * Simple toggle component for quick auto-generation
 * Can be easily added to existing pages
 */
export function AutoGenerateToggle() {
  const { isRunning, toggle } = useAutoGenerateOrders({})

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="auto-generate-toggle"
        checked={isRunning}
        onCheckedChange={checked => {
          if (checked) {
            toggle()
          }
        }}
      />
      <Label htmlFor="auto-generate-toggle" className="text-sm">
        Auto-generate (1-3 orders every 5s)
      </Label>
    </div>
  )
}
