import { IconMapPin, IconPlus, IconTrash } from '@tabler/icons-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AllowedAddresses() {
  return (
    <PageLayout
      header={{
        title: 'Allowed IP Addresses',
        description: 'Manage IP addresses that can access your organization',
        action: (
          <Button>
            <IconPlus className="mr-2 h-4 w-4" />
            Add IP Address
          </Button>
        ),
      }}
    >
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconMapPin className="h-5 w-5" />
              <CardTitle>IP Whitelist</CardTitle>
            </div>
            <CardDescription>Configure allowed IP addresses for enhanced security</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sample IP addresses */}
              <div className="divide-y">
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium font-mono">192.168.1.0/24</p>
                    <p className="text-sm text-muted-foreground">Office Network</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-green-500/10 text-green-600 rounded">Active</span>
                    <Button variant="ghost" size="sm">
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium font-mono">203.0.113.42</p>
                    <p className="text-sm text-muted-foreground">VPN Server</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-green-500/10 text-green-600 rounded">Active</span>
                    <Button variant="ghost" size="sm">
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium font-mono">10.0.0.0/8</p>
                    <p className="text-sm text-muted-foreground">Internal Network</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-green-500/10 text-green-600 rounded">Active</span>
                    <Button variant="ghost" size="sm">
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  This is a placeholder page for managing allowed IP addresses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
