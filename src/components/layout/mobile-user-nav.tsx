import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { IconUserCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

// Mock user for mobile
const mockUser = {
  fullName: 'Mobile User',
  emailAddresses: [{ emailAddress: 'mobile@example.com' }],
  imageUrl: undefined
};

export function MobileUserNav() {
  const navigate = useNavigate();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <IconUserCircle className="h-5 w-5" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-56'
        align='end'
        sideOffset={10}
        forceMount
      >
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>
              {mockUser.fullName}
            </p>
            <p className='text-muted-foreground text-xs leading-none'>
              {mockUser.emailAddresses[0].emailAddress}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>New Team</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/dashboard/overview')}>
          Home
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}