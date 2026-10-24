import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackTurn } from "./chatFallback";

test("never repeats itself across greetings and uncertainty", () => {
  let brief: Record<string, unknown> = {};
  let last = "Hi, I'm your Roomwise design agent. Tell me about the room you want to refresh.";
  const replies: string[] = [];
  for (const message of ["hello", "hi", "I don't know", "help me choose"]) {
    const turn = fallbackTurn(message, brief, last);
    replies.push(turn.reply);
    brief = turn.brief;
    last = turn.reply;
  }
  for (let i = 1; i < replies.length; i++) assert.notEqual(replies[i], replies[i - 1]);
  assert.match(replies[0], /^Hi!/);
  assert.match(replies[2], /figure it out|help you choose/);
});

test("pulls several details out of one message and acknowledges them", () => {
  const turn = fallbackTurn("My bedroom is 12x14 ft, budget about $1.5k, I have a dog and want to keep my bed", {});
  assert.equal(turn.brief.roomType, "bedroom");
  assert.equal(turn.brief.dimensions, "12x14 ft");
  assert.equal(turn.brief.budget, 1500);
  assert.deepEqual(turn.brief.constraints, ["pets"]);
  assert.equal(turn.brief.keep, "bed");
  assert.match(turn.reply, /bedroom/);
  assert.match(turn.reply, /\$1,500/);
});

test("a bare number answers the budget question; dimensions are not a budget", () => {
  assert.equal(fallbackTurn("2000", { roomType: "bedroom" }).brief.budget, 2000);
  assert.equal(fallbackTurn("not sure, maybe 1200?", { roomType: "bedroom" }).brief.budget, 1200);
  assert.match(fallbackTurn("build my plan", { roomType: "bedroom" }).reply, /rough budget first/);
  assert.equal(fallbackTurn("it's 12 by 14", { roomType: "bedroom" }).brief.budget, undefined);
  assert.equal(fallbackTurn("1800 eur", { roomType: "bedroom" }).brief.currency, "EUR");
});

test("loads the demo room on request", () => {
  const turn = fallbackTurn("use the demo room", {});
  assert.equal(turn.brief.budget, 1500);
  assert.match(turn.reply, /build my plan/);
});

test("points to the + button for photos, invites once, and acknowledges uploads", () => {
  const ask = fallbackTurn("I have a photo, is that okay?", {});
  assert.match(ask.reply, /\+ button/);
  assert.doesNotMatch(ask.reply, /didn't quite catch/);

  const invited = fallbackTurn("my bedroom", {});
  assert.match(invited.reply, /\+ button/);
  assert.doesNotMatch(fallbackTurn("my bedroom", {}, "", { count: 0, prompted: true }).reply, /\+/);

  const thanks = fallbackTurn("I've attached 2 room photos.", { roomType: "bedroom" }, "", { count: 2, prompted: true });
  assert.match(thanks.reply, /saved your 2 photos/);
  assert.equal(thanks.brief.budget, undefined);
  assert.match(fallbackTurn("its a photo of my bedroom", {}, "", { count: 0, prompted: true }).reply, /No rush/);
});

test("after a photo is analysed, shares the read and confirms the room instead of re-asking", () => {
  const seen = "This appears to be a minimalist living room with a grey sofa.";
  const turn = fallbackTurn("I've attached 1 room photo.", {}, "", { count: 1, prompted: true, seen });
  assert.match(turn.reply, /my read of your photo: This appears/);
  assert.match(turn.reply, /looks like a living room; is that the room/);
  assert.doesNotMatch(turn.reply, /saved your photo|Which room/);
  assert.equal(turn.brief.roomType, undefined);
});

test("photos sent together with typed text are acknowledged and the text is still read", () => {
  const turn = fallbackTurn("this is my bedroom, budget $900", {}, "", { count: 1, prompted: true, justAttached: true });
  assert.equal(turn.brief.roomType, "bedroom");
  assert.equal(turn.brief.budget, 900);
  assert.match(turn.reply, /saved your photo/);
  assert.doesNotMatch(turn.reply, /Tap the \+ button/);
});
