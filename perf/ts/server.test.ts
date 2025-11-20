import { check, sleep } from "k6";
import http from "k6/http";
import { Options } from "k6/options";

export const options: Options = {
  vus: 5,
  duration: "10s",
};

export default function () {
  const res = http.get("https://pzero-api.incmix.com/auth/login");
  check(res, {
    "status 200": (r) => r.status === 200,
  });
  sleep(1);
}
