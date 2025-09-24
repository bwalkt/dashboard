import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaGraph } from './area-graph';
import { BarGraph } from './bar-graph';
import { PieGraph } from './pie-graph';
import { RecentSales } from './recent-sales';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';

export default function OverViewPage() {
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between space-y-2'>
        
          <div className='hidden items-center space-x-2 md:flex'>
            <Button>Download</Button>
          </div>
        </div>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:px-6 xl:grid-cols-4'>
              <Card>
                <CardHeader>
                  <CardDescription>Total Revenue</CardDescription>
                  <CardTitle className='text-2xl font-semibold tabular-nums lg:text-3xl'>
                    $1,250.00
                  </CardTitle>
                  <CardAction>
                    <Badge variant='outline'>
                      <IconTrendingUp />
                      +12.5%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                  <div className='line-clamp-1 flex gap-2 font-medium'>
                    Trending up this month <IconTrendingUp className='size-4' />
                  </div>
                  <div className='text-muted-foreground'>
                    Visitors for the last 6 months
                  </div>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>New Customers</CardDescription>
                  <CardTitle className='text-2xl font-semibold tabular-nums lg:text-3xl'>
                    1,234
                  </CardTitle>
                  <CardAction>
                    <Badge variant='outline'>
                      <IconTrendingDown />
                      -20%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                  <div className='line-clamp-1 flex gap-2 font-medium'>
                    Down 20% this period <IconTrendingDown className='size-4' />
                  </div>
                  <div className='text-muted-foreground'>
                    Acquisition needs attention
                  </div>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Active Accounts</CardDescription>
                  <CardTitle className='text-2xl font-semibold tabular-nums lg:text-3xl'>
                    45,678
                  </CardTitle>
                  <CardAction>
                    <Badge variant='outline'>
                      <IconTrendingUp />
                      +12.5%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                  <div className='line-clamp-1 flex gap-2 font-medium'>
                    Strong user retention <IconTrendingUp className='size-4' />
                  </div>
                  <div className='text-muted-foreground'>
                    Engagement exceed targets
                  </div>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Growth Rate</CardDescription>
                  <CardTitle className='text-2xl font-semibold tabular-nums lg:text-3xl'>
                    4.5%
                  </CardTitle>
                  <CardAction>
                    <Badge variant='outline'>
                      <IconTrendingUp />
                      +4.5%
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                  <div className='line-clamp-1 flex gap-2 font-medium'>
                    Steady performance increase{' '}
                    <IconTrendingUp className='size-4' />
                  </div>
                  <div className='text-muted-foreground'>
                    Meets growth projections
                  </div>
                </CardFooter>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
              <div className='col-span-4'>
                <BarGraph />
              </div>
              <Card className='col-span-4 md:col-span-3'>
                <RecentSales />
              </Card>
              <div className='col-span-4'>
                <AreaGraph />
              </div>
              <div className='col-span-4 md:col-span-3'>
                <PieGraph />
              </div>
            </div>
          </div>
      </div>
    </PageContainer>
  );
}
