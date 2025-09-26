import PageContainer from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { AreaGraph } from "./area-graph";
import { BarGraph } from "./bar-graph";
import { PieGraph } from "./pie-graph";
import { RecentSales } from "./recent-sales";
import { useAutoGenerateOrders } from "@/hooks/use-auto-generate-orders";
import { useMemo } from "react";

export default function OverViewPage() {
  const config = useMemo(
    () => ({
      intervalMs: 5000,
      minOrdersPerBatch: 1,
      maxOrdersPerBatch: 3,
    }),
    []
  );

  const { isRunning, totalGenerated, totalSuccessful, successRate, toggle } = useAutoGenerateOrders(config);

  return (
    <PageContainer>
      <div className="flex flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch id="auto-generate-toggle" checked={isRunning} onCheckedChange={toggle} />
              <Label htmlFor="auto-generate-toggle" className="text-sm">
                Auto-generate (1-3 orders every 5s)
              </Label>
            </div>
            {isRunning && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {totalGenerated} orders
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {successRate.toFixed(0)}% success
                </Badge>
              </div>
            )}
          </div>
          <div className="hidden items-center space-x-2 md:flex">
            <Button>Download</Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:px-6 xl:grid-cols-5">
            <Card>
              <CardHeader>
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">$1,250.00</CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    +12.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Trending up this month <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">Visitors for the last 6 months</div>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Auto-Generated Orders</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">{totalGenerated}</CardTitle>
                <CardAction>
                  <Badge variant={isRunning ? "default" : "secondary"}>{isRunning ? "Active" : "Inactive"}</Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">{totalSuccessful} successful orders</div>
                <div className="text-muted-foreground">{isRunning ? "Generating every 5s" : "Toggle to start auto-generation"}</div>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>New Customers</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">1,234</CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingDown />
                    -20%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Down 20% this period <IconTrendingDown className="size-4" />
                </div>
                <div className="text-muted-foreground">Acquisition needs attention</div>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Active Accounts</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">45,678</CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    +12.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Strong user retention <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">Engagement exceed targets</div>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Growth Rate</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">4.5%</CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    +4.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Steady performance increase <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">Meets growth projections</div>
              </CardFooter>
            </Card>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <BarGraph />
            </div>
            <Card className="col-span-4 md:col-span-3">
              <RecentSales />
            </Card>
            <div className="col-span-4">
              <AreaGraph />
            </div>
            <div className="col-span-4 md:col-span-3">
              <PieGraph />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
