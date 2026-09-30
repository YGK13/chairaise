// ============================================================
// ChaiRaise — server-owned AI task tests (draft_email prompt + parser)
// ============================================================
import { describe, it, expect } from "vitest";
import {
  buildDraftEmailRequest, parseDraft, donorFacts, orgContextBlock, stageGoal,
  DRAFT_EMAIL_SYSTEM, STAGE_GOALS,
} from "@/lib/aiTasks";
import { STAGES } from "@/lib/constants";

const donor = {
  name: "Miriam Katz", community: "Beth Shalom", city: "Teaneck", industry: "Healthcare",
  focus_areas: ["education", "youth"], net_worth: "25000000", annual_giving: "50000",
  connector_paths: [{ name: "Rabbi Levy", role: "Rabbi" }], pipeline_stage: "not_started",
};
const org = { name: "Yeshiva Or Torah", tagline: "Torah and excellence" };
const profile = { mission: "Educating the next generation.", key_programs: ["Teen beit midrash", "Summer kollel"] };

describe("buildDraftEmailRequest", () => {
  it("puts static guidelines first and caches the per-org block", () => {
    const { system } = buildDraftEmailRequest({ donor, org, orgProfile: profile });
    expect(system).toHaveLength(2);
    expect(system[0].text).toBe(DRAFT_EMAIL_SYSTEM);
    expect(system[0].cache_control).toBeUndefined();
    expect(system[1].cache_control).toEqual({ type: "ephemeral" });
    expect(system[1].text).toContain("Yeshiva Or Torah");
    expect(system[1].text).toContain("Teen beit midrash");
  });

  it("org block is identical for different donors (cacheable prefix)", () => {
    const a = buildDraftEmailRequest({ donor, org, orgProfile: profile });
    const b = buildDraftEmailRequest({ donor: { name: "Other Person" }, org, orgProfile: profile });
    expect(a.system).toEqual(b.system);
    expect(a.messages[0].content).not.toEqual(b.messages[0].content);
  });

  it("never sends wealth fields to the model", () => {
    const { messages } = buildDraftEmailRequest({ donor, org, orgProfile: profile });
    const text = messages[0].content;
    expect(text).not.toMatch(/25000000|25,000,000|\$25M/);
    expect(text).not.toMatch(/50000|50,000/);
    expect(text).toContain("Miriam Katz");
    expect(text).toContain("Rabbi Levy");
  });

  it("uses the stage-specific goal", () => {
    const followUp = buildDraftEmailRequest({ donor: { ...donor, pipeline_stage: "email_sent" }, org });
    expect(followUp.messages[0].content).toContain(STAGE_GOALS.email_sent);
    expect(followUp.messages[0].content).toContain("60–120 words");
    const steward = buildDraftEmailRequest({ donor: { ...donor, pipeline_stage: "commitment" }, org });
    expect(steward.messages[0].content).toContain("Do not ask for anything");
  });

  it("signs off as the signed-in sender", () => {
    const { messages } = buildDraftEmailRequest({ donor, org, senderName: "David Cohen" });
    expect(messages[0].content).toContain("Sign off as: David Cohen, Yeshiva Or Torah");
  });

  it("batch mode asks for merge fields and omits donor facts", () => {
    const { messages } = buildDraftEmailRequest({ donor: {}, org, mode: "batch", template: { name: "Synagogue Connection", segment: "Members" } });
    const text = messages[0].content;
    expect(text).toContain("{name}");
    expect(text).toContain("{community}");
    expect(text).not.toContain("DONOR RECORD");
  });

  it("clips oversized fields and includes recent history", () => {
    const { messages } = buildDraftEmailRequest({
      donor: { ...donor, custom_hook: "x".repeat(5000) }, org,
      recentActivity: ["Jan 1 — call: talked about the teen program", "", "a", "b", "c", "d", "e"],
    });
    expect(messages[0].content.length).toBeLessThan(3000);
    expect(messages[0].content).toContain("talked about the teen program");
    expect(messages[0].content.match(/^- /gm)).toHaveLength(5);
  });

  it("warns the model off inventing facts when there is no profile", () => {
    expect(orgContextBlock({ name: "New Shul" }, {})).toMatch(/do not invent/i);
  });
});

describe("stageGoal", () => {
  it("has a goal for every pipeline stage and falls back to first contact", () => {
    for (const s of STAGES) expect(STAGE_GOALS[s.id]).toBeTruthy();
    expect(stageGoal("bogus")).toBe(STAGE_GOALS.not_started);
  });
});

describe("donorFacts", () => {
  it("accepts comma-separated focus areas and string connectors", () => {
    const facts = donorFacts({ name: "A", focus_areas: "israel, education", connector_paths: ["Sam"] }).join("\n");
    expect(facts).toContain("Interests: israel, education");
    expect(facts).toContain("Mutual connections (may be named): Sam");
  });
});

describe("parseDraft", () => {
  it("parses clean JSON", () => {
    expect(parseDraft('{"subject":"Hi","body":"Dear Miriam,\\n\\nThanks."}')).toEqual({ subject: "Hi", body: "Dear Miriam,\n\nThanks." });
  });
  it("tolerates code fences and leading chatter", () => {
    const out = parseDraft('Here you go:\n```json\n{"subject":"S","body":"B"}\n```');
    expect(out).toEqual({ subject: "S", body: "B" });
  });
  it("falls back to a Subject: line", () => {
    expect(parseDraft("Subject: Coffee?\n\nDear Miriam,\nHello")).toEqual({ subject: "Coffee?", body: "Dear Miriam,\nHello" });
  });
  it("keeps plain text as the body", () => {
    expect(parseDraft("Dear Miriam, hello")).toEqual({ subject: "", body: "Dear Miriam, hello" });
    expect(parseDraft("")).toEqual({ subject: "", body: "" });
  });
});
