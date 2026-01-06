import type { FastifyRequest } from "fastify";
import {
  getProxyTargetByUrl,
  ProxyTargetsCacheUnavailableError,
} from "./proxy-targets-cache.service.js";

const PROXY_TARGET_HEADER = 'x-proxy-target';

async function getProxyTarget(url: string) {
  const target = await getProxyTargetByUrl(url);
  if (!target) {
    // Genuine "not found" case - target URL doesn't exist
    throw new Error(`Proxy target with url ${url} not found`);
  }
  return target;
}

export async function constructProxyURL(request: FastifyRequest): Promise<string> {
  const targetUrl = request.headers[PROXY_TARGET_HEADER];
  if (!targetUrl) {
    throw new Error(`Proxy target is required in ${PROXY_TARGET_HEADER} header`);
  }

  if (typeof targetUrl !== 'string') {
    throw new Error(`Proxy target must be a string in ${PROXY_TARGET_HEADER} header`);
  }

  const target = await getProxyTarget(targetUrl);
  console.log(request.raw.url,request.url)
  const url = new URL(request.raw.url as string, process.env.SERVER_BASE_URL || "http://localhost:8090");
  let path = url.pathname.replace(/^\/proxy\//, '');
  
  const queryParams = url.search;
  if (queryParams && queryParams.length > 0) {
    path += queryParams;
  }
  
  // Use port from target or default to 80
  const port = target.port ?? 80;
  return `http://${target.url}:${port}/${path}`;

}