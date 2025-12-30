import { IconActivity, IconDeviceLaptop, IconDeviceMobile, IconLogout } from '@tabler/icons-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
              {/* Sample sessions */}
              <div className="divide-y">
                <div className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconDeviceLaptop className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Chrome on MacOS</p>
                      <p className="text-sm text-muted-foreground">192.168.1.100 • San Francisco, CA</p>
                      <p className="text-xs text-muted-foreground">Started 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-green-500/10 text-green-600 rounded">Current</span>
                  </div>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconDeviceMobile className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">iOS App</p>
                      <p className="text-sm text-muted-foreground">203.0.113.42 • New York, NY</p>
                      <p className="text-xs text-muted-foreground">Started 1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      End Session
                    </Button>
                  </div>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconDeviceLaptop className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Firefox on Windows</p>
                      <p className="text-sm text-muted-foreground">10.0.0.15 • London, UK</p>
                      <p className="text-xs text-muted-foreground">Started 3 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      End Session
                    </Button>
                  </div>
                </div>
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
