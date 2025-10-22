import { useAuth } from '@/contexts/AuthContext'

/**
 * Displays the authenticated user's debug information: email, id, selected `user_metadata` fields (full_name, name, avatar_url, picture) and a preformatted JSON dump of the raw `user_metadata`; renders "No user data" when no user is present.
 *
 * @returns The React element containing the user debug panel or a fallback message when no user is available.
 */
export function UserDebugInfo() {
  const { user } = useAuth()

  if (!user) {
    return <div>No user data</div>
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg m-4">
      <h3 className="font-bold mb-2">User Debug Info</h3>
      <div className="text-sm space-y-1">
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>ID:</strong> {user.id}
        </div>
        <div>
          <strong>Full Name:</strong> {user.user_metadata?.full_name || 'Not set'}
        </div>
        <div>
          <strong>Name:</strong> {user.user_metadata?.name || 'Not set'}
        </div>
        <div>
          <strong>Avatar URL:</strong> {user.user_metadata?.avatar_url || 'Not set'}
        </div>
        <div>
          <strong>Picture:</strong> {user.user_metadata?.picture || 'Not set'}
        </div>
        <div>
          <strong>Raw Metadata:</strong>
        </div>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">{JSON.stringify(user.user_metadata, null, 2)}</pre>
      </div>
    </div>
  )
}
