import type { FastifyRequest } from "fastify";
import { getProxyTargetById } from "./proxy-targets-cache.service.js";

const PROXY_TARGET_ID_HEADER = 'x-proxy-target-id';

async function getProxyTarget(id: string) {
  const target = await getProxyTargetById(id);
  if (!target) {
    throw new Error(`Proxy target with id ${id} not found`);
  }
  return target;
}

export async function constructProxyURL(request: FastifyRequest): Promise<string> {
  const id = request.headers[PROXY_TARGET_ID_HEADER];
  if (!id) {
    throw new Error(`Proxy target id is required in ${PROXY_TARGET_ID_HEADER} header`);
  }

  if (typeof id !== 'string') {
    throw new Error(`Proxy target id must be a string in ${PROXY_TARGET_ID_HEADER} header`);
  }

  const target = await getProxyTarget(id);
  console.log(request.raw.url,request.url)
  const url = new URL(request.raw.url as string, process.env.SERVER_BASE_URL || "http://localhost:8090");
  let path = url.pathname.replace(/^\/proxy\//, '');

  const queryParams = url.search;
  if (queryParams && queryParams.length > 0) {
    path += queryParams;
  }

  return `http://${target.url}:${target.port}/${path}`;

}