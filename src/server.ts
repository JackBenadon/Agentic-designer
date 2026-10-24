import { createServer } from "node:http";
import { ZodError } from "zod";
import { createDemoPlan } from "./demo.js";

const port = Number(process.env.PORT ?? 3000);
const maxBodyBytes = 100_000;

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  let body = "";

  for await (const chunk of request) {
    body += chunk.toString();
    if (Buffer.byteLength(body) > maxBodyBytes) {
      throw new Error("Request body is too large.");
    }
  }

  return JSON.parse(body);
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  try {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { ok: true, service: "roomwise" });
      return;
    }

    if (request.method === "GET" && request.url === "/demo") {
      sendJson(response, 200, createDemoPlan());
      return;
    }

    if (request.method === "POST" && request.url === "/plans") {
      // Load live configuration only when a live plan is requested.
      const { createRoomPlan } = await import("./agent.js");
      const plan = await createRoomPlan(await readJson(request));
      sendJson(response, 200, plan);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof ZodError) {
      sendJson(response, 400, { error: "Invalid Roomwise data", issues: error.issues });
    } else {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Request failed" });
    }
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Roomwise API listening on port ${port}`);
});
