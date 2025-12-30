import { IconSettings, IconUserPlus, IconUsers } from '@tabler/icons-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MembersRoles() {
  return (
    <PageLayout
      header={{
        title: 'Members and Roles',
        description: 'Manage team members and their roles',
        action: (
          <Button>
            <IconUserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        ),
      }}
    >
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconUsers className="h-5 w-5" />
              <CardTitle>Team Members</CardTitle>
            </div>
            <CardDescription>Manage your organization's team members and their permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sample team members */}
              <div className="divide-y">
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">John Doe</p>
                    <p className="text-sm text-muted-foreground">john.doe@acme.com</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-primary/10 rounded">Admin</span>
                    <Button variant="ghost" size="sm">
                      <IconSettings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Jane Smith</p>
                    <p className="text-sm text-muted-foreground">jane.smith@acme.com</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-primary/10 rounded">Editor</span>
                    <Button variant="ghost" size="sm">
                      <IconSettings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Bob Johnson</p>
                    <p className="text-sm text-muted-foreground">bob.johnson@acme.com</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-primary/10 rounded">Viewer</span>
                    <Button variant="ghost" size="sm">
                      <IconSettings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  This is a placeholder page for Members and Roles management.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
