import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserAvatarProfile } from "@/components/user-avatar-profile";

export function MobileUserNav() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error("Failed to sign out: " + error.message);
      } else {
        toast.success("Signed out successfully");
        navigate("/auth/sign-in");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Sign out error:", error);
    }
  };

  // Create user object for display
  const userData = user
    ? {
        fullName: user.name || "User",
        emailAddresses: [{ emailAddress: user.email || "user@example.com" }],
        imageUrl: user.avatar,
      }
    : {
        fullName: "Mobile User",
        emailAddresses: [{ emailAddress: "mobile@example.com" }],
        imageUrl: undefined,
      };

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
          <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>New Team</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/dashboard/overview")}>Home</DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
