import type { User } from '@pzero/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserAvatarProfileProps {
  className?: string
  showInfo?: boolean
  user: User | null
}

/**
 * Render a user avatar with optional name and email information.
 *
 * When `user` is provided the avatar image source is `user.avatar`; the fallback shows the first
 * two characters of `user.name` in uppercase. If `user` or `user.name` is missing the fallback
 * displays `"CN"` and image src/alt resolve to empty strings. When `showInfo` is `true` the
 * component also renders the user's name and email in a small, truncated info block.
 *
 * @param className - Optional additional CSS classes applied to the Avatar container
 * @param showInfo - Whether to display the user's name and email alongside the avatar (default: `false`)
 * @param user - The user object to display, or `null` to render fallback content
 * @returns The JSX element containing the avatar and, when enabled, the user info block
 */
export function UserAvatarProfile({ className, showInfo = false, user }: UserAvatarProfileProps) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className={className}>
        <AvatarImage src={user?.avatar || ''} alt={user?.name || ''} />
        <AvatarFallback className="rounded-lg">{user?.name?.slice(0, 2)?.toUpperCase() || 'CN'}</AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{user?.name || ''}</span>
          <span className="truncate text-xs">{user?.email || ''}</span>
        </div>
      )}
    </div>
  )
}
