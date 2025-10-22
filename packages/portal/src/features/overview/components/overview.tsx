import { useMemo } from "react";
import PageContainer from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarGraphSkeleton } from "./bar-graph-skeleton";

/**
 * Render the overview dashboard for the admin portal.
 *
 * Renders a page container with an auto-generate toggle (configured to produce 1–3 orders every 5 seconds) that displays runtime badges when active, a row of summary stat cards (revenue, orders, completed orders, products), and a section containing a bar graph and recent sales list.
 *
 * @returns The JSX element representing the overview dashboard page.
 */
export default function OverViewPage() {
  const config = useMemo(
    () => ({
      intervalMs: 5000,
      minOrdersPerBatch: 1,
      maxOrdersPerBatch: 3,
    }),
    [],
  )

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-4"></div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 px-0 md:grid-cols-2 xl:grid-cols-4">
           
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <BarGraphSkeleton />
            </div>
            <div className="col-span-4 p-0 md:col-span-3"></div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
