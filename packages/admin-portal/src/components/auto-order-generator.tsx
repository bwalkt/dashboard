import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoGenerateOrders } from '@/hooks/use-auto-generate-orders'

/**
 * Renders a small toggle that controls automatic order generation.
 *
 * When enabled, the toggle initiates automatic generation of 1–3 orders every 5 seconds; the switch state reflects whether auto-generation is running.
 *
 * @returns The JSX element for the auto-generate toggle control
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
