import type { FastifyInstance } from "fastify";
import type { Section, SectionResponse } from "../types/index.js";

   const termsData: SectionResponse = {
        sections: [
          {
            title: "User & Customer Responsibilities",
            content:
              "These clauses outline what the user of a service or system must do to maintain security. Key responsibilities often include protecting account information like logon IDs and passwords and refraining from unauthorized copying or distribution of confidential data. Acceptable use policies typically prohibit activities such as attempting to reverse-engineer software, harassing other users, degrading system performance, or accessing systems without authorization. Additionally, users may be required to employ reasonable security safeguards, follow industry-standard practices, and comply with applicable laws and regulations when using the services.",
          },
          {
            title: "Confidentiality & Data Protection",
            content:
              "Confidential information typically remains the property of the owner, and access is granted only as necessary to use the services. Data use and processing clauses often specify that personal data should only be processed as required for the services, not retained longer than necessary, and not used for third-party purposes. Service providers are typically responsible for maintaining security programs to protect the confidentiality and security of customer data, guard against threats, and prevent unauthorized access.",
          },
          {
            title: "Limitation of Liability & Warranties",
            content:
              'These clauses limit the legal and financial exposure of the service provider, recognizing that perfect security is not always achievable. Services may be provided "AS-IS" without warranties, and the service provider may disclaim support obligations and other liabilities. Liability is often capped at a specific amount, such as the total subscription fees paid over a defined period. Customers may also agree to assume the risk for damages or losses resulting from the service.',
          },
          {
            title: "Incident Reporting & Response",
            content:
              "These terms outline the procedures to follow in the event of a security breach. Customers may be required to immediately report unauthorized access or disclosure of confidential information to the service provider. Cooperation is often necessary, including designating contact persons to respond to security events and take recommended mitigation actions.",
          },
        ],
      };
export async function termsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /terms - Get terms and conditions
  fastify.get<{
    Reply: SectionResponse | { error: string };
  }>("/terms", async (request, reply) => {
    try {
      // In production, this would come from a database or CMS
      // For now, returning static terms data
   

      return reply.code(200).send(termsData);
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching terms:");
      return reply.code(500).send({ error: "Failed to fetch terms" });
    }
  });
}
