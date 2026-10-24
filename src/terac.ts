import { MCPServerStreamableHttp, createMCPToolStaticFilter } from "@openai/agents";
import { config } from "./config";

const ROOMWISE_TERAC_TOOLS = [
  "terac_get_context",
  "terac_request_feasibility",
  "terac_get_feasibility_request",
];

/**
 * Connects Roomwise to Terac with the smallest safe tool surface needed to
 * request reviewer feasibility and retrieve its status. Launching recruitment,
 * approving submissions, and any other spending actions are deliberately not
 * exposed to the coordinator.
 */
export function createTeracServer(): MCPServerStreamableHttp | null {
  if (!config.teracApiKey) return null;

  return new MCPServerStreamableHttp({
    name: "Terac reviewer recruitment",
    url: config.teracMcpUrl,
    requestInit: {
      headers: {
        "x-api-key": config.teracApiKey,
      },
    },
    toolFilter: createMCPToolStaticFilter({ allowed: ROOMWISE_TERAC_TOOLS }),
    cacheToolsList: true,
    timeout: 15_000,
  });
}
