import { IconSettings, IconUsers } from '@tabler/icons-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const sampleMembers = [
  { id: '1', name: 'John Doe', email: 'john.doe@acme.com', role: 'Admin' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@acme.com', role: 'Editor' },
  { id: '3', name: 'Bob Johnson', email: 'bob.johnson@acme.com', role: 'Viewer' },
]

export default function MembersRoles() {
  return (
    <PageLayout title="Members and Roles" description="Manage team members and their roles" showBreadcrumbs={true}>
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
              {/* Team members list */}
              <div className="divide-y">
                {sampleMembers.map(member => (
                  <div key={member.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-primary/10 rounded">{member.role}</span>
                      <Button variant="ghost" size="sm" aria-label={`Manage settings for ${member.name}`}>
                        <IconSettings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
