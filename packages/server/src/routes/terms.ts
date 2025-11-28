import type { SectionResponse } from "@pzero/shared/pzero";
import type { FastifyInstance } from "fastify";
import { termsData } from "../data/terms.js";
import { formatDataToSections, TERMS_TITLE_MAPPING } from "../utils/content-formatter.js";
export async function termsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /terms - Get terms and conditions
  fastify.get<{
    Reply: SectionResponse | { error: string };
  }>("/terms", async (request, reply) => {
    try {
      // Format the terms data into sections using the common utility
      const formattedTerms = formatDataToSections(termsData, TERMS_TITLE_MAPPING);
      
      return reply.code(200).send(formattedTerms);
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching terms:");
      return reply.code(500).send({ error: "Failed to fetch terms" });
    }
  });
}
