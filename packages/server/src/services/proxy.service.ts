import type { FastifyRequest } from "fastify";

const PROXY_TARGET_ID_HEADER = 'x-proxy-target-id';

const proxyTargets = [{
id: "1",
name: "Salesforce",
url: "pzero-sfdc-server-vanilla",
port: 3000,
}]

 function getProxyTarget(id: string) {
  const target = proxyTargets.find((target) => target.id === id);
  if (!target) {
    throw new Error(`Proxy target with id ${id} not found`);
  }
  return target;
}

export function constructProxyURL(request: FastifyRequest) {
  const id = request.headers[PROXY_TARGET_ID_HEADER];
  if (!id) {
    throw new Error(`Proxy target id is required in ${PROXY_TARGET_ID_HEADER} header`);
  }

  if (typeof id !== 'string') {
    throw new Error(`Proxy target id must be a string in ${PROXY_TARGET_ID_HEADER} header`);
  }

  const target = getProxyTarget(id);
  console.log(request.raw.url,request.url)
  const url = new URL(request.raw.url as string, process.env.SERVER_BASE_URL || "http://localhost:8090");
  let path = url.pathname.replace(/^\/proxy\//, '');

  const queryParams = url.search;
  if (queryParams && queryParams.length > 0) {
    path += queryParams;
  }

  return `http://${target.url}:${target.port}/${path}`;

}