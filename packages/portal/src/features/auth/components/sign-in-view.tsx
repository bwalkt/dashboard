import { api } from '@pzero/shared/api'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'

/**
 * Render the sign-in page with an email/password form and a GitHub OAuth option.
 *
 * The component redirects authenticated users (when `user` is present and not loading)
 * to the previous location if available or to `/dashboard/overview`. The UI includes
 * a sign-in form, a GitHub sign-in button, and links to sign-up, Terms of Service, and Privacy Policy.
 *
 * @returns The sign-in page React element containing the form, OAuth button, and related navigation links.
 */
export default function SignInViewPage(_props: {}) {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (authStore.user && !authStore.loading) {
      navigate({ to: '/dashboard/overview', replace: true })
    }
  }, [authStore.user, authStore.loading, navigate])

  const handleResendCode = async () => {
    setIsLoading(true)
    try {
      await api.post('/auth/login', { email })
      setOtpCode('') // Clear the OTP input
      toast.success('New verification code sent to your email')
    } catch (error: any) {
      console.error('Resend error:', error)
      const errorMessage = error?.message || 'Failed to resend code. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (emailSent) {
      // Handle OTP verification
      if (otpCode.length !== 6) {
        toast.error('Please enter a 6-digit verification code')
        return
      }

      setIsLoading(true)
      try {
        const result = await api.post('/auth/login/verify', {
          email: email,
          code: otpCode,
        })

        // Update AuthStore with the logged in user
        if (result.user) {
          await authStore.setUser(result.user)
        }

        toast.success('Sign in successful!')
        navigate({ to: '/dashboard/overview', replace: true })
      } catch (error: any) {
        console.error('Verification error:', error)
        // Extract the error message from the API error
        const errorMessage = error?.message || 'Invalid or expired verification code. Please try again.'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    } else {
      // Handle sending verification code
      const formEmail = (e.target as any).email.value

      setIsLoading(true)
      try {
        await api.post('/auth/login', { email: formEmail })
        setEmail(formEmail)
        setEmailSent(true)
        toast.success('Check your email for verification code')
      } catch (error: any) {
        console.error('Sign in error:', error)
        // Extract the error message from the API error
        const errorMessage = error?.message || 'Failed to sign in. Please try again.'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }
  }

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
                  <Input
                    id="email"
                    type="email"
                    placeholder="test@example.com"
                    defaultValue={email || 'test@example.com'}
                    disabled={emailSent}
                    required
                  />
                </div>

                {emailSent && (
                  <div className="space-y-2">
                    <Label htmlFor="otpCode">Verification Code</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpCode} onChange={value => setOtpCode(value)} autoFocus>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Enter the 6-digit code sent to your email
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Processing...' : emailSent ? 'Verify Code' : 'Continue'}
                </Button>

                {emailSent && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      Resend Code
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setEmailSent(false)
                        setOtpCode('')
                      }}
                      disabled={isLoading}
                    >
                      Use Different Email
                    </Button>
                  </>
                )}
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">Or continue with</span>
                </div>
              </div>
              <div className="mt-4 text-center text-sm">
                Don't have an account?{' '}
                <Link to="/auth/sign-up" className="hover:text-primary underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground px-8 text-center text-sm">
            By clicking continue, you agree to our{' '}
            <Link to="/terms" className="hover:text-primary underline underline-offset-4">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="hover:text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
