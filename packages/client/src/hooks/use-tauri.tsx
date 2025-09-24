import { useState, useEffect } from 'react';

interface TauriInfo {
  isTauri: boolean;
  isMobile: boolean;
  platform: string | null;
}

export function useTauri(): TauriInfo {
  const [tauriInfo, setTauriInfo] = useState<TauriInfo>({
    isTauri: false,
    isMobile: false,
    platform: null
  });

  useEffect(() => {
    const checkTauri = async () => {
      try {
        // Check if we're in Tauri environment
        const isTauri = window.__TAURI__ !== undefined;

        if (isTauri) {
          // Dynamically import Tauri APIs
          const { platform } = await import('@tauri-apps/api/os');
          const platformName = await platform();
          const isMobile = platformName === 'android' || platformName === 'ios';

          setTauriInfo({
            isTauri: true,
            isMobile,
            platform: platformName
          });
        } else {
          setTauriInfo({
            isTauri: false,
            isMobile: false,
            platform: null
          });
        }
      } catch (error) {
        // If Tauri APIs are not available, we're probably in a web environment
        setTauriInfo({
          isTauri: false,
          isMobile: false,
          platform: null
        });
      }
    };

    checkTauri();
  }, []);

  return tauriInfo;
}
