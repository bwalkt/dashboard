import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface SlackStyleConfirmEmailProps {
  confirmationCode?: string;
  recipientName?: string;
}

const baseUrl =
  process.env.SERVER_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:8090";

export const SlackStyleConfirmEmail = ({
  confirmationCode = "123456",
  recipientName = "there",
}: SlackStyleConfirmEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={`${baseUrl}/assets/images/logo.png`}
              width="120"
              height="120"
              alt="P-Zero Logo"
              style={logo}
            />
          </Section>

          <Heading style={h1}>Confirm your email address</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Text style={text}>
            Your confirmation code is below — enter it in your open browser
            window and we'll help you get signed in.
          </Text>

          <Section style={codeContainer}>
            <Text style={code}>{confirmationCode}</Text>
          </Section>

          <Text style={text}>
            If you didn't request this email, there's nothing to worry about —
            you can safely ignore it.
          </Text>

          <Section style={footer}>
            <Text style={footerText}>© 2024 P-Zero. All rights reserved.</Text>
            <Text style={footerText}>
              <Link href="#" style={footerLink}>
                Privacy Policy
              </Link>{" "}
              |{" "}
              <Link href="#" style={footerLink}>
                Terms of Service
              </Link>{" "}
              |{" "}
              <Link href="#" style={footerLink}>
                Contact Us
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default SlackStyleConfirmEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif',
};

const container = {
  maxWidth: "37.5em",
  margin: "0 auto",
  padding: "20px 0 48px",
};

const logoContainer = {
  marginTop: "32px",
};

const logo = {
  margin: "0 auto",
  display: "block",
};

const h1 = {
  color: "#1d1c1d",
  fontSize: "36px",
  fontWeight: "700",
  margin: "30px 0",
  padding: "0",
  lineHeight: "42px",
};

const text = {
  color: "#1d1c1d",
  fontSize: "20px",
  lineHeight: "28px",
  marginBottom: "16px",
};

const codeContainer = {
  background: "rgb(245, 244, 245)",
  borderRadius: "4px",
  margin: "30px 0",
  padding: "40px 10px",
};

const code = {
  color: "#1d1c1d",
  fontSize: "30px",
  fontWeight: "700",
  textAlign: "center" as const,
  margin: "0",
  padding: "0",
  letterSpacing: "6px",
};

const footer = {
  borderTop: "1px solid #e5e5e5",
  marginTop: "40px",
  paddingTop: "32px",
};

const footerText = {
  color: "#b7b7b7",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "8px 0",
  textAlign: "center" as const,
};

const footerLink = {
  color: "#b7b7b7",
  fontSize: "12px",
  textDecoration: "underline",
};
