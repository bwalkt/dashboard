import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Renders a profile settings page populated with mock user data.
 *
 * The component is purely presentational: it displays an avatar (with image fallback to initials),
 * the user's name and email, editable Full Name and Email fields with default values, and Cancel/Save actions.
 *
 * @returns A React element containing the profile settings UI populated with mock user data.
 */
export default function ProfileViewPage() {
  // Mock user data
  const mockUser = {
    fullName: 'Dashboard User',
    emailAddress: 'user@example.com',
    imageUrl: undefined,
  }

  return (
    <div className="flex w-full flex-col p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={mockUser.imageUrl} alt={mockUser.fullName} />
              <AvatarFallback className="text-lg">
                {mockUser.fullName?.slice(0, 2)?.toUpperCase() || 'DU'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{mockUser.fullName}</h3>
              <p className="text-sm text-muted-foreground">{mockUser.emailAddress}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" defaultValue={mockUser.fullName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={mockUser.emailAddress} />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
