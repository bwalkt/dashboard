import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatarProfile } from '@/components/user-avatar-profile'
import { useAuthStore } from '@/stores/auth'

/**
 * Render a mobile-friendly user avatar button that opens a dropdown menu with account and navigation actions.
 *
 * The menu displays the user's name and primary email. Selecting "Sign Out" attempts to sign the user out, shows a success or error toast, and navigates to the sign-in page on successful sign-out.
 *
 * @returns A JSX element containing the user avatar trigger and dropdown menu with profile, navigation, and sign-out actions.
 */
export function MobileUserNav() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleSignOut = async () => {
    try {
      await logout()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Sign out error:', error)
    }
  }

  // Create user object for display
  const userData = user
    ? {
        fullName: user.name || 'User',
        emailAddresses: [{ emailAddress: user.email || 'user@example.com' }],
        imageUrl: user.avatar,
      }
    : {
        fullName: 'Mobile User',
        emailAddresses: [{ emailAddress: 'mobile@example.com' }],
        imageUrl: undefined,
      }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <UserAvatarProfile user={user} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={10} forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">{userData.fullName}</p>
            <p className="text-muted-foreground text-xs leading-none">{userData.emailAddresses[0].emailAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/settings' })}>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>New Team</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: '/dashboard/overview' })}>Home</DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
