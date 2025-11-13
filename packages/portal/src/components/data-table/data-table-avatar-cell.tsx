import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarCellProps {
  name?: string;
  email?: string;
  avatarUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  showEmail?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm", 
  lg: "h-10 w-10 text-base"
};

const getInitials = (name?: string, email?: string): string => {
  if (name) {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0]?.slice(0, 2).toUpperCase() || '';
  }
  
  if (email) {
    const emailName = email.split('@')[0];
    return emailName.slice(0, 2).toUpperCase();
  }
  
  return '??';
};

export function AvatarCell({ 
  name, 
  email, 
  avatarUrl, 
  className,
  size = "md",
  showName = false,
  showEmail = false
}: AvatarCellProps) {
  const initials = getInitials(name, email);

  if (showName || showEmail) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Avatar className={cn(sizeClasses[size])}>
          <AvatarImage src={avatarUrl} alt={name || email || 'User avatar'} />
          <AvatarFallback className="bg-muted font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          {showName && name && (
            <span className="font-medium text-sm truncate">{name}</span>
          )}
          {showEmail && email && (
            <span className="text-xs text-muted-foreground truncate">{email}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl} alt={name || email || 'User avatar'} />
      <AvatarFallback className="bg-muted font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}