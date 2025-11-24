import type { FastifyInstance } from "fastify";

export interface FAQ {
  question: string;
  answer: string;
}

export interface FAQResponse {
  title: string;
  faqs: FAQ[];
}

export async function faqRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /faq - Get all FAQs
  fastify.get<{
    Reply: FAQResponse | { error: string };
  }>("/faq", async (request, reply) => {
    try {
      // In production, this would come from a database or CMS
      // For now, returning static FAQ data
      const faqData: FAQResponse = {
        title: "Frequently Asked Questions",
        faqs: [
          {
            question: "How do you protect my personal information?",
            answer:
              "We use industry-standard encryption protocols and secure servers to protect your data. All sensitive information is stored in compliance with data protection regulations.",
          },
          {
            question: "What measures are in place to prevent data breaches?",
            answer:
              "Our systems undergo regular security audits and vulnerability scanning. We employ robust firewalls, intrusion detection systems, and strict access controls to prevent unauthorized access.",
          },
          {
            question: "Will my data be shared with third parties?",
            answer:
              "No, we do not sell or share your personal information with third parties for marketing purposes without your explicit consent. Please refer to our privacy policy for more details.",
          },
          {
            question: "How often are security updates performed?",
            answer:
              "Security patches and system updates are applied as soon as they are available and after rigorous testing to ensure system integrity and protection against the latest threats.",
          },
          {
            question:
              "What should I do if I notice suspicious activity on my account?",
            answer:
              "If you suspect any unusual activity, please contact our support team immediately. We will investigate the issue and take necessary steps to secure your account.",
          },
          {
            question: "How can I enable two-factor authentication?",
            answer:
              "You can enable two-factor authentication in your account settings. We support authentication via SMS, email, or authenticator apps for enhanced security.",
          },
          {
            question: "What is a primary device?",
            answer:
              "A primary device is your main trusted device that can manage and connect other devices to your account. It has elevated permissions for device management.",
          },
          {
            question: "How many devices can I connect to my account?",
            answer:
              "You can connect up to 10 devices to your account. The primary device can manage connections for all secondary devices.",
          },
          {
            question: "How do I verify my phone number?",
            answer:
              "Click the 'Verify Phone Number' button in settings. We'll send you a 6-digit verification code via SMS that you need to enter to confirm your phone number.",
          },
          {
            question: "How do I verify my email address?",
            answer:
              "Click the 'Verify Email Address' button in settings. We'll send you a 6-digit verification code to your email that you need to enter to confirm your email address.",
          },
        ],
      };

      return reply.code(200).send(faqData);
    } catch (error) {
      fastify.log.error("Error fetching FAQs:", error);
      return reply.code(500).send({ error: "Failed to fetch FAQs" });
    }
  });
}
