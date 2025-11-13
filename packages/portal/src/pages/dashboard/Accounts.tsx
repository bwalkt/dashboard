import Main from '@/components/layout/main'

/**
 * Render the Accounts page UI.
 *
 * Displays accounts management interface with header, sidebar toggle, and filter options.
 *
 * @returns A JSX element representing the Accounts page.
 */
export default function AccountsPage() {
  const handleFilterToggle = (isOpen: boolean) => {
    console.log('Accounts filter toggle:', isOpen)
  }

  return (
    <Main 
      title="Accounts" 
      description="Manage user accounts and permissions"
      onFilterToggle={handleFilterToggle}
    >
      <div className="p-6">
        <p>Accounts page content goes here</p>
      </div>
    </Main>
  )
}
