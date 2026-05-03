import { apiGet } from "./http";
import { mapBootstrapDto } from "./adapters";
import type { BootstrapDto } from "./dto";
import type { Bootstrap } from "../types/settings";

export async function getBootstrap(): Promise<Bootstrap> {
  return mapBootstrapDto(await apiGet<BootstrapDto>("/v1/bootstrap"));
}
