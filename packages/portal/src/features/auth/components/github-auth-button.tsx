import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTauriAuth } from "@/hooks/use-tauri-auth";

export default function GithubSignInButton() {
  const { signInWithGitHub: webSignIn, loading: webLoading } = useAuth();
  const { signInWithGitHub: tauriSignIn, isLoading: tauriLoading, error: tauriError } = useTauriAuth();

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;
  const loading = isTauri ? tauriLoading : webLoading;

  const handleGitHubSignIn = async () => {
    try {
      if (isTauri) {
        await tauriSignIn();
        if (tauriError) {
          toast.error("Failed to sign in with GitHub: " + tauriError);
        } else {
          toast.success("Opening GitHub authentication...");
        }
      } else {
        const { error } = await webSignIn();
        if (error) {
          toast.error("Failed to sign in with GitHub: " + error.message);
        } else {
          toast.success("Redirecting to GitHub...");
        }
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
