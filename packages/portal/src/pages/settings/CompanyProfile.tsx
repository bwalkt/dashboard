import { IconBuilding } from '@tabler/icons-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CompanyProfile() {
  return (
    <PageLayout
      title="Company Profile"
      description="Manage your organization's profile and details"
      showBreadcrumbs={true}
    >
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconBuilding className="h-5 w-5" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>Update your organization's basic information and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                  <p className="text-lg">Acme Corporation</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Industry</p>
                  <p className="text-lg">Technology</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Founded</p>
                  <p className="text-lg">2020</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employees</p>
                  <p className="text-lg">50-100</p>
                </div>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  This is a placeholder page for Company Profile settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
