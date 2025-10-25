import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { Tailwind } from '@react-email/tailwind'
import * as React from 'react'

interface VerificationEmailProps {
  name?: string
  verificationLink: string
}

export const VerificationEmail = ({ name = 'User', verificationLink }: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address - P-Zero</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto bg-white rounded-lg shadow-md my-16 p-10 max-w-2xl">
            <Heading className="text-blue-600 text-3xl font-bold text-center my-10">
              Verify Your Email Address
            </Heading>

            <Text className="text-gray-800 text-base leading-relaxed mx-10 my-4">Hello {name},</Text>

            <Text className="text-gray-800 text-base leading-relaxed mx-10 my-4">
              Thank you for signing up! Please verify your email address by clicking the button below:
            </Text>

            <Section className="text-center my-8">
              <Button
                href={verificationLink}
                className="bg-blue-600 text-white font-semibold rounded-md px-7 py-3.5 inline-block no-underline hover:bg-blue-700"
              >
                Verify Email Address
              </Button>
            </Section>

            <Text className="text-gray-800 text-base leading-relaxed mx-10 my-4">
              If the button doesn't work, you can copy and paste this link into your browser:
            </Text>

            <Link href={verificationLink} className="text-blue-600 text-sm underline mx-10 block break-all">
              {verificationLink}
            </Link>

            <Text className="text-gray-800 text-base leading-relaxed mx-10 my-4">
              <strong>This verification link will expire in 24 hours.</strong>
            </Text>

            <Text className="text-gray-800 text-base leading-relaxed mx-10 my-4">
              If you didn't create an account, you can safely ignore this email.
            </Text>

            <Section className="mt-10 pt-5 border-t border-gray-200">
              <Text className="text-gray-500 text-sm text-center mx-10">
                This is an automated email from P-Zero. Please do not reply to this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default VerificationEmail
