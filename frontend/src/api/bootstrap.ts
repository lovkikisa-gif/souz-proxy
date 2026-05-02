import { apiGet } from "./http";
import type { Bootstrap } from "../types/settings";

export function getBootstrap(): Promise<Bootstrap> {
  return apiGet<Bootstrap>("/v1/bootstrap");
}
