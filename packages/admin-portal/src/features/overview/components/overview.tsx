import { useMemo } from "react";
import PageContainer from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarGraph } from "./bar-graph";
import CompletedOrdersCard from "./cards/completed-orders-card";
import TotalOrdersCard from "./cards/total-orders-card";
import TotalProductsCard from "./cards/total-products-card";
import TotalRevenueCard from "./cards/total-revenue-card";
import { RecentSales } from "./recent-sales";

export default function OverViewPage() {
  const config = useMemo(
    () => ({
      intervalMs: 5000,
      minOrdersPerBatch: 1,
      maxOrdersPerBatch: 3,
    }),
    []
  );

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-4">
      
        
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 px-0 md:grid-cols-2 xl:grid-cols-4">
            <TotalRevenueCard />
            <TotalOrdersCard />
            <CompletedOrdersCard />
            <TotalProductsCard />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <BarGraph />
            </div>
            <div className="col-span-4 p-0 md:col-span-3">
            
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
