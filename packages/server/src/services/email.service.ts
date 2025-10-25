import * as brevo from '@getbrevo/brevo'
import { render } from '@react-email/render'
import { config } from '../config/env'
import SlackStyleConfirmEmail from '../emails/slack-style-confirm'
import VerificationEmail from '../emails/verification-email'

interface SendEmailOptions {
  to: string
  subject: string
  htmlContent: string
  textContent?: string
}

interface SendVerificationEmailOptions {
  to: string
  verificationToken: string
  name?: string
}

interface SendConfirmationCodeEmailOptions {
  to: string
  confirmationCode: string
  recipientName?: string
}

class EmailService {
  private apiInstance: brevo.TransactionalEmailsApi
  private apiKey: brevo.TransactionalEmailsApiApiKeys

  constructor() {
    this.apiInstance = new brevo.TransactionalEmailsApi()
    this.apiKey = this.apiInstance.authentications['apiKey']
    this.apiKey.apiKey = config.BREVO_API_KEY
  }

  /**
   * Send a generic email using Brevo
   */
  public async sendEmail(options: SendEmailOptions): Promise<void> {
    const sendSmtpEmail = new brevo.SendSmtpEmail()

    sendSmtpEmail.sender = {
      name: config.BREVO_SENDER_NAME,
      email: config.BREVO_SENDER_EMAIL,
    }

    sendSmtpEmail.to = [
      {
        email: options.to,
      },
    ]

    sendSmtpEmail.subject = options.subject
    sendSmtpEmail.htmlContent = options.htmlContent

    if (options.textContent) {
      sendSmtpEmail.textContent = options.textContent
    }

    try {
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail)
      console.log('✅ Email sent successfully:', response.body)
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      throw new Error('Failed to send email')
    }
  }

  /**
   * Send email verification email using React Email template
   */
  public async sendVerificationEmail(options: SendVerificationEmailOptions): Promise<void> {
    const verificationLink = `${config.OAUTH_REDIRECT_URL}/verify-email?token=${options.verificationToken}`
    const name = options.name || 'User'

    // Render the React Email template to HTML
    const htmlContent = await render(
      VerificationEmail({
        name,
        verificationLink,
      }),
      {
        pretty: true,
      },
    )

    // Render plain text version
    const textContent = await render(
      VerificationEmail({
        name,
        verificationLink,
      }),
      {
        plainText: true,
      },
    )

    await this.sendEmail({
      to: options.to,
      subject: 'Verify Your Email Address - P-Zero',
      htmlContent,
      textContent,
    })
  }

  /**
   * Send confirmation code email using Slack-style template
   */
  public async sendConfirmationCodeEmail(options: SendConfirmationCodeEmailOptions): Promise<void> {
    const recipientName = options.recipientName || 'there'

    // Render the React Email template to HTML
    const htmlContent = await render(
      SlackStyleConfirmEmail({
        confirmationCode: options.confirmationCode,
        recipientName,
      }),
      {
        pretty: true,
      },
    )

    // Render plain text version
    const textContent = await render(
      SlackStyleConfirmEmail({
        confirmationCode: options.confirmationCode,
        recipientName,
      }),
      {
        plainText: true,
      },
    )

    await this.sendEmail({
      to: options.to,
      subject: 'Confirm your email address - P-Zero',
      htmlContent,
      textContent,
    })
  }

  /**
   * Validate email format
   */
  public validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

// Export singleton instance
export const emailService = new EmailService()
