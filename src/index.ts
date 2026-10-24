import { ZodError } from "zod";
import { createDemoPlan } from "./demo.js";

function printUsage(): void {
  console.error('Usage: npm run dev -- --demo');
  console.error('   or: npm run dev -- \'{"room_type":"living room",...}\'');
}

const input = process.argv[2];
if (!input) {
  printUsage();
  process.exit(1);
}

try {
  if (input === "--demo") {
    console.log(JSON.stringify(createDemoPlan(), null, 2));
  } else {
    // Keep live-only configuration and SDK initialization out of the credential-free demo path.
    const { createRoomPlan } = await import("./agent.js");
    const plan = await createRoomPlan(JSON.parse(input));
    console.log(JSON.stringify(plan, null, 2));
  }
} catch (error) {
  if (error instanceof ZodError) {
    console.error(JSON.stringify({ error: "Invalid Roomwise data", issues: error.issues }, null, 2));
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exit(1);
}
