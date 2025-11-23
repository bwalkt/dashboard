import { api } from '@pzero/shared/api'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Render the sign-up page with a local form and a GitHub OAuth sign-in option.
 *
 * If an authenticated user is present (and auth is not loading), navigates to the previous location or `/dashboard/overview`. Submitting the form prevents default submission and shows an informational toast instructing the user to use GitHub OAuth; no account creation is performed by the form.
 *
 * @returns The sign-up page as a JSX element.
 */
export default function SignUpViewPage() {
  const navigate = useNavigate()
  const { user, loading, signUp } = useAuth()
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate({ to: '/dashboard/overview', replace: true })
    }
  }, [user, loading, navigate])

  const handleResendCode = async () => {
    setIsLoading(true)
    try {
      await signUp({ email, name })
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (emailSent) {
      // Handle OTP verification
      if (otpCode.length !== 6) {
        toast.error('Please enter a 6-digit verification code')
        return
      }

      setIsLoading(true)
      try {
        const result = await api.post('/auth/register/verify', {
          email: email,
          code: otpCode,
        })

        toast.success('Registration successful!')
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
      // Handle initial registration
      const formEmail = (e.target as any).email.value
      const formName = (e.target as any).fullName.value

      setIsLoading(true)
      try {
        const result = await signUp({
          email: formEmail,
          name: formName,
        })

        setEmail(formEmail)
        setName(formName)
        setEmailSent(true)
        toast.success('Check your email for verification code')
      } catch (error: any) {
        console.error('Sign up error:', error)
        // Extract the error message from the API error
        const errorMessage = error?.message || 'Failed to sign up. Please try again.'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="relative h-screen flex flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
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
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account to access the dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    defaultValue={name}
                    disabled={emailSent}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your_mail+test@example.com"
                    defaultValue={email || 'your_mail+test@example.com'}
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
                  {isLoading ? 'Processing...' : emailSent ? 'Verify Code' : 'Register'}
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
                Already have an account?{' '}
                <Link to="/auth/sign-in" className="hover:text-primary underline underline-offset-4">
                  Sign in
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
