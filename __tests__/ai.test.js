// ============================================================
// ChaiRaise — AI Engine Tests
// Verify scoring, classification, and cause matching logic
// ============================================================
import { describe, it, expect } from "vitest";
import { causeMatch, aiTemplate, aiScore, aiLikelihood, aiAsk } from "@/lib/ai";

describe("causeMatch", () => {
  it("returns 0 when no org profile", () => {
    expect(causeMatch({ name: "Test" }, null)).toBe(0);
    expect(causeMatch({ name: "Test" }, undefined)).toBe(0);
  });

  it("returns 0 when donor has no focus areas", () => {
    const orgProfile = { cause_keywords: ["education", "torah"], target_demographics: [], geographic_focus: [] };
    expect(causeMatch({ name: "Test" }, orgProfile)).toBe(0);
  });

  it("returns >0 when donor focus areas overlap with org keywords", () => {
    const donor = { name: "Test", focus_areas: ["education", "youth"], community: "synagogue" };
    const orgProfile = { cause_keywords: ["education", "torah", "youth"], target_demographics: [], geographic_focus: [] };
    const score = causeMatch(donor, orgProfile);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns higher score for more overlap", () => {
    const orgProfile = { cause_keywords: ["education", "torah", "israel", "youth", "community"], target_demographics: [], geographic_focus: [] };
    const lowMatch = causeMatch({ name: "A", focus_areas: ["sports"] }, orgProfile);
    const highMatch = causeMatch({ name: "B", focus_areas: ["education", "torah", "israel"] }, orgProfile);
    expect(highMatch).toBeGreaterThan(lowMatch);
  });
});

describe("aiTemplate", () => {
  it("returns T-E for null/empty donor", () => {
    expect(aiTemplate(null)).toBe("T-E");
    expect(aiTemplate({})).toBe("T-E");
  });

  it("returns T-A for donors with school", () => {
    expect(aiTemplate({ school: "Sample University" })).toBe("T-A");
  });

  it("returns T-B for synagogue community", () => {
    expect(aiTemplate({ community: "Local Synagogue" })).toBe("T-B");
  });

  it("returns T-C for prior givers", () => {
    expect(aiTemplate({ prior_gift_detail: "$50K in 2023" })).toBe("T-C");
  });

  it("returns T-F for Sephardic community", () => {
    expect(aiTemplate({ community: "Sephardic Center" })).toBe("T-F");
  });
});

describe("aiScore", () => {
  it("returns 0 for empty donor", () => {
    expect(aiScore({}, [])).toBe(0);
  });

  it("increases with more data", () => {
    const sparse = aiScore({ name: "Test" }, []);
    const rich = aiScore({
      name: "Test", email: "t@t.com", phone: "123", net_worth: 1000000,
      community: "Synagogue", warmth_score: 8,
    }, []);
    expect(rich).toBeGreaterThan(sparse);
  });

  it("increases with recent activity", () => {
    const donor = { name: "Test", email: "t@t.com", id: "d1" };
    const noActs = aiScore(donor, []);
    const withActs = aiScore(donor, [
      { did: "d1", type: "call", date: new Date().toISOString() },
    ]);
    expect(withActs).toBeGreaterThan(noActs);
  });

  it("caps at 100", () => {
    const maxDonor = {
      name: "Test", email: "t@t.com", phone: "123", net_worth: 1e9,
      community: "Big", warmth_score: 10, pipeline_stage: "commitment",
      connector_paths: [{ name: "Intro" }],
    };
    const acts = Array.from({ length: 20 }, (_, i) => ({
      did: maxDonor.name, type: "call", date: new Date().toISOString(),
    }));
    expect(aiScore(maxDonor, acts)).toBeLessThanOrEqual(100);
  });
});

describe("aiLikelihood", () => {
  it("returns Low for low engagement", () => {
    expect(aiLikelihood(10, { pipeline_stage: "not_started" }).l).toBe("Low");
  });

  it("returns Very High for commitment stage", () => {
    expect(aiLikelihood(90, { pipeline_stage: "commitment" }).l).toBe("Very High");
  });

  it("returns Medium for mid-pipeline", () => {
    expect(aiLikelihood(50, { pipeline_stage: "email_sent" }).l).toBe("Medium");
  });
});

describe("aiAsk", () => {
  it("returns 18000 for donors with no data", () => {
    expect(aiAsk({})).toBe(18000);
  });

  it("returns higher for higher net worth", () => {
    expect(aiAsk({ net_worth: 100000000 })).toBe(100000);
    expect(aiAsk({ net_worth: 50000000 })).toBe(75000);
    expect(aiAsk({ net_worth: 10000000 })).toBe(50000);
  });

  it("returns 1.5x prior giving when available", () => {
    expect(aiAsk({ annual_giving: 50000 })).toBe(75000);
    expect(aiAsk({ annual_giving: 10000 })).toBe(25000); // Max of 1.5x and 25000
  });
});
