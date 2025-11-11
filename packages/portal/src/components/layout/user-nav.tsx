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
import { useAuth } from '@/contexts/AuthContext'

/**
 * Render a user avatar dropdown menu that provides account-related navigation and sign-out.
 *
 * The menu displays the current user's name and email, offers items for Profile, Billing,
 * Settings, New Team, and Home, and includes a Sign Out action. Activating Sign Out calls
 * the authentication sign-out function, shows a success toast and navigates to the sign-in
 * page on success, or shows an error toast on failure.
 *
 * @returns A JSX element rendering the user navigation dropdown menu
 */
export function UserNav() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        toast.error('Failed to sign out: ' + error.message)
      } else {
        toast.success('Signed out successfully')
        navigate({ to: '/auth/sign-in' })
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Sign out error:', error)
    }
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
            <p className="text-sm leading-none font-medium">{user?.name}</p>
            <p className="text-muted-foreground text-xs leading-none">{user?.email}</p>
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
