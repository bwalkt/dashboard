import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";
import GithubSignInButton from "./github-auth-button";

export default function SignInViewPage(_props: { stars: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      const from = location.state?.from?.pathname || "/dashboard/overview";
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, we'll just show a message since we're focusing on GitHub OAuth
    toast.info("Please use GitHub OAuth to sign in");
  };

  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-300" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <img src="/boardwalktech-logo.svg" className="mr-2 h-16 w-160" />
        </div>
      </div>
      <div className="flex h-full items-center justify-center p-4 lg:p-8">
        <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to access the dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="test@example.com" defaultValue="test@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Enter your password" required />
                </div>
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">Or continue with</span>
                </div>
              </div>

              <GithubSignInButton />

              <div className="mt-4 text-center text-sm">
                Don't have an account?{" "}
                <Link to="/auth/sign-up" className="hover:text-primary underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground px-8 text-center text-sm">
            By clicking continue, you agree to our{" "}
            <Link to="/terms" className="hover:text-primary underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="hover:text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
