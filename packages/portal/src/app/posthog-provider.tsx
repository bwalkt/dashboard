import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { ReactNode, useEffect } from "react";

const POSTHOG_API_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

interface PostHogProviderWrapperProps {
  children: ReactNode;
}

export function PostHogProviderWrapper({ children }: PostHogProviderWrapperProps) {
  useEffect(() => {
    if (!POSTHOG_API_KEY) {
      console.warn("PostHog API key not found. Analytics will be disabled.");
      return;
    }

    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
        // maskTextContent: false,
      },
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          posthog.debug();
        }
      },
    });
  }, []);

  if (!POSTHOG_API_KEY) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
