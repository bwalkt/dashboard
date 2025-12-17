#!/bin/bash

# Script to create GitHub issues for tracking organization management TODOs
# Usage: ./scripts/create-org-todos.sh

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository."
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: GitHub CLI is not authenticated."
    echo "Please run: gh auth login"
    exit 1
fi

# Get the repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

if [ -z "$REPO" ]; then
    echo "Error: Could not determine repository name."
    exit 1
fi

echo "Creating GitHub issues for organization management TODOs in $REPO..."

# Create issue for edit organization route
gh issue create \
    --title "Implement Edit Organization Page" \
    --body "## Description
Create an edit page for organizations at route \`/dashboard/orgs/:id/edit\`.

## Requirements
- [ ] Create route file at \`src/routes/dashboard/orgs/\$id/edit.tsx\`
- [ ] Implement form with fields: name, handle, website, contact_email, avatar_url
- [ ] Use the \`updateOrg\` method from \`useOrgsStore\`
- [ ] Add validation for required fields
- [ ] Handle errors gracefully with toast notifications
- [ ] Navigate back to orgs list after successful update

## Related Files
- \`src/features/orgs/components/columns.tsx\` - Contains navigation to edit page
- \`src/stores/orgs.ts\` - Contains updateOrg method
- \`packages/server/src/routes/orgs.ts\` - Backend API endpoint

## Acceptance Criteria
- User can navigate to edit page from organization row actions
- Form is pre-populated with existing organization data
- Changes are persisted to database
- User receives feedback on success/failure
" \
    --label "enhancement" \
    --label "frontend" \
    --assignee "@me" || echo "Issue 1 creation failed"

# Create issue for delete confirmation modal
gh issue create \
    --title "Improve Delete Organization Confirmation UX" \
    --body "## Description
Replace browser \`confirm()\` dialog with a custom confirmation modal for better UX.

## Requirements
- [ ] Create a reusable confirmation dialog component
- [ ] Use shadcn/ui AlertDialog component
- [ ] Show organization name in confirmation message
- [ ] Add \"type to confirm\" pattern for destructive actions
- [ ] Show loading state during deletion

## Related Files
- \`src/features/orgs/components/columns.tsx\` - Current delete implementation
- \`src/stores/orgs.ts\` - Contains deleteOrg method

## Acceptance Criteria
- Custom modal appears instead of browser confirm dialog
- User must type organization name to confirm deletion
- Loading state is shown during deletion
- Proper error handling with toast notifications
" \
    --label "enhancement" \
    --label "ux" \
    --label "frontend" \
    --assignee "@me" || echo "Issue 2 creation failed"

# Create issue for duplicate organization improvements
gh issue create \
    --title "Improve Duplicate Organization Feature" \
    --body "## Description
Enhance the duplicate organization functionality with better naming and handle generation.

## Requirements
- [ ] Use handle generation utilities from \`@pzero/shared/utils/handles\`
- [ ] Implement smart naming (e.g., \"Org Copy\", \"Org Copy 2\", etc.)
- [ ] Check for handle uniqueness before creating duplicate
- [ ] Allow user to edit name/handle before creating duplicate
- [ ] Show loading state during duplication

## Related Files
- \`src/features/orgs/components/columns.tsx\` - Current copy implementation
- \`packages/shared/src/utils/handles.ts\` - Handle generation utilities
- \`src/stores/orgs.ts\` - Contains createOrg method

## Acceptance Criteria
- Duplicated organizations have unique, meaningful names
- Handles are guaranteed to be unique
- User can optionally customize the duplicate before creation
- Proper error handling for duplicate handles
" \
    --label "enhancement" \
    --label "frontend" \
    --assignee "@me" || echo "Issue 3 creation failed"

# Create issue for bulk actions
gh issue create \
    --title "Implement Bulk Actions for Organizations" \
    --body "## Description
Add bulk action support for selected organizations in the data table.

## Requirements
- [ ] Implement bulk delete with confirmation
- [ ] Add bulk export to CSV/JSON
- [ ] Add bulk status update (if applicable)
- [ ] Show selected count in table header
- [ ] Add \"Select All\" across pages option

## Related Files
- \`src/pages/dashboard/Orgs.tsx\` - Main organizations page
- \`src/app/data-table.tsx\` - Data table component
- \`src/features/orgs/components/columns.tsx\` - Contains select column

## Acceptance Criteria
- Users can select multiple organizations
- Bulk actions appear when items are selected
- Confirmation required for destructive actions
- Progress indicator for long-running operations
" \
    --label "enhancement" \
    --label "feature" \
    --label "frontend" \
    --assignee "@me" || echo "Issue 4 creation failed"

echo "GitHub issues created successfully!"
echo "View them at: https://github.com/$REPO/issues"