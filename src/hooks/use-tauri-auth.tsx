import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { supabase } from "@/lib/supabase";

interface SupabaseAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: any;
}

export function useTauriAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGitHub = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the Rust function to initiate OAuth
      const authUrl = await invoke<string>("sign_in_with_github");
      console.log("Auth URL:", authUrl);

      // On iOS, we need to handle the deep link differently
      if (window.__TAURI__) {
        // Listen for the deep link callback
        const unlisten = await listen("tauri://url", async (event) => {
          console.log("Received deep link:", event.payload);

          try {
            const authResponse = await invoke<SupabaseAuthResponse>("handle_auth_callback", {
              url: event.payload as string,
            });

            // Set the session in Supabase
            const { data, error } = await supabase.auth.setSession({
              access_token: authResponse.access_token,
              refresh_token: authResponse.refresh_token,
            });

            if (error) {
              setError(error.message);
            } else {
              console.log("Auth successful:", data);
            }
          } catch (err) {
            setError(err as string);
          } finally {
            setIsLoading(false);
            unlisten();
          }
        });

        // Also listen for iOS-specific deep link events
        const iosUnlisten = await listen("deep-link", async (event) => {
          console.log("Received iOS deep link:", event.payload);

          try {
            const authResponse = await invoke<SupabaseAuthResponse>("handle_auth_callback", {
              url: event.payload as string,
            });

            // Set the session in Supabase
            const { data, error } = await supabase.auth.setSession({
              access_token: authResponse.access_token,
              refresh_token: authResponse.refresh_token,
            });

            if (error) {
              setError(error.message);
            } else {
              console.log("Auth successful:", data);
            }
          } catch (err) {
            setError(err as string);
          } finally {
            setIsLoading(false);
            iosUnlisten();
          }
        });
      }
    } catch (err) {
      setError(err as string);
      setIsLoading(false);
    }
  };

  return {
    signInWithGitHub,
    isLoading,
    error,
  };
}
