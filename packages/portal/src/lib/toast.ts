import { toast } from 'sonner'

/**
 * Reusable toast utilities with consistent behavior
 */
export const toastUtils = {
  /**
   * Show an error toast that auto-dismisses after 8 seconds
   */
  error: (message: string, options?: { description?: string }) => {
    return toast.error(message, {
      duration: 8000, // 8 seconds
      description: options?.description,
    })
  },

  /**
   * Show a persistent success toast that stays until dismissed by user
   */
  success: (message: string, options?: { description?: string }) => {
    return toast.success(message, {
      duration: Infinity,
      dismissible: true,
      description: options?.description,
    })
  },

  /**
   * Show a persistent warning toast that stays until dismissed by user
   */
  warning: (message: string, options?: { description?: string }) => {
    return toast.warning(message, {
      duration: Infinity,
      dismissible: true,
      description: options?.description,
    })
  },

  /**
   * Show a temporary success toast that auto-dismisses
   */
  successTemp: (message: string, options?: { description?: string; duration?: number }) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      dismissible: true,
      description: options?.description,
    })
  },

  /**
   * Show a temporary info toast that auto-dismisses
   */
  info: (message: string, options?: { description?: string; duration?: number }) => {
    return toast.info(message, {
      duration: options?.duration || 4000,
      dismissible: true,
      description: options?.description,
    })
  },
}
