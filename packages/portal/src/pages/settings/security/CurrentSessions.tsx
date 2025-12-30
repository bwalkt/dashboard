import { IconActivity, IconDeviceLaptop, IconDeviceMobile } from '@tabler/icons-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const sampleSessions = [
  {
    id: '1',
    device: 'Chrome on macOS',
    icon: 'laptop',
    ip: '192.168.1.100',
    location: 'San Francisco, CA',
    startTime: '2 hours ago',
    isCurrent: true,
  },
  {
    id: '2',
    device: 'iOS App',
    icon: 'mobile',
    ip: '203.0.113.42',
    location: 'New York, NY',
    startTime: '1 day ago',
    isCurrent: false,
  },
  {
    id: '3',
    device: 'Firefox on Windows',
    icon: 'laptop',
    ip: '10.0.0.15',
    location: 'London, UK',
    startTime: '3 days ago',
    isCurrent: false,
  },
]

export default function CurrentSessions() {
  return (
    <PageLayout title="Current Sessions" description="View and manage active sessions" showBreadcrumbs={true}>
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconActivity className="h-5 w-5" />
              <CardTitle>Active Sessions</CardTitle>
            </div>
            <CardDescription>Monitor all active sessions for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sessions list */}
              <div className="divide-y">
                {sampleSessions.map(session => {
                  const DeviceIcon = session.icon === 'mobile' ? IconDeviceMobile : IconDeviceLaptop
                  return (
                    <div key={session.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DeviceIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{session.device}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.ip} • {session.location}
                          </p>
                          <p className="text-xs text-muted-foreground">Started {session.startTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.isCurrent ? (
                          <span className="px-2 py-1 text-xs bg-green-500/10 text-green-600 rounded">Current</span>
                        ) : (
                          <Button variant="ghost" size="sm">
                            End Session
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  This is a placeholder page for managing current sessions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
