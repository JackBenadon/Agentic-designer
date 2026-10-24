import { NextResponse } from "next/server";
import { createDemoPlan } from "@/demo";

export async function POST(request: Request) {
  try {
    const input = await request.json();

    // Keep the demo usable without credentials; never pretend this is a live result.
    if (!process.env.GROQ_API_KEY || !process.env.EXA_API_KEY) {
      return NextResponse.json(createDemoPlan());
    }

    const { createRoomPlan } = await import("@/agent");
    const plan = await createRoomPlan(input);
    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create room plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
