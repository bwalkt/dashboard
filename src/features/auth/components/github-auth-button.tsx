import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function GithubSignInButton() {
  const { signInWithGitHub, loading } = useAuth();

  const handleGitHubSignIn = async () => {
    try {
      const { error } = await signInWithGitHub();
      if (error) {
        toast.error("Failed to sign in with GitHub: " + error.message);
      } else {
        toast.success("Redirecting to GitHub...");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("GitHub sign in error:", error);
    }
  };

  return (
    <Button className="w-full" variant="outline" type="button" onClick={handleGitHubSignIn} disabled={loading}>
      <Icons.github className="mr-2 h-4 w-4" />
      {loading ? "Signing in..." : "Continue with Github"}
    </Button>
  );
}
