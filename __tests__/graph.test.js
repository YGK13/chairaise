// ============================================================
// ChaiRaise — Social Graph Engine Tests
// Verify VCF parsing, fuzzy matching, BFS path finding
// ============================================================
import { describe, it, expect } from "vitest";
import {
  parseVCF, parseLinkedInCSV, levenshtein, normPhone,
  fuzzyMatchDonor, edgeStrength, bfsPath,
} from "@/lib/graph";

describe("parseVCF", () => {
  it("parses basic vCard", () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:john@example.com
TEL:+1-555-123-4567
ORG:Acme Corp
END:VCARD`;
    const contacts = parseVCF(vcf);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("John Doe");
    expect(contacts[0].emails).toEqual(["john@example.com"]);
    expect(contacts[0].org).toBe("Acme Corp");
  });

  it("parses multiple vCards", () => {
    const vcf = `BEGIN:VCARD
FN:Alice
END:VCARD
BEGIN:VCARD
FN:Bob
END:VCARD`;
    expect(parseVCF(vcf)).toHaveLength(2);
  });

  it("skips contacts without names", () => {
    const vcf = `BEGIN:VCARD
EMAIL:noname@test.com
END:VCARD`;
    expect(parseVCF(vcf)).toHaveLength(0);
  });

  it("handles structured N field", () => {
    const vcf = `BEGIN:VCARD
N:Goldstein;David;;;
END:VCARD`;
    const contacts = parseVCF(vcf);
    expect(contacts[0].name).toBe("David Goldstein");
    expect(contacts[0].first).toBe("David");
    expect(contacts[0].last).toBe("Goldstein");
  });
});

describe("parseLinkedInCSV", () => {
  it("parses LinkedIn export format", () => {
    const csv = `Notes line 1
Notes line 2
Notes line 3
First Name,Last Name,Email Address,Company,Position,Connected On
David,Cohen,david@test.com,Goldman Sachs,VP,15 Jan 2024
Sarah,Levy,,Temple Beth El,Director,20 Mar 2024`;
    const contacts = parseLinkedInCSV(csv);
    expect(contacts).toHaveLength(2);
    expect(contacts[0].name).toBe("David Cohen");
    expect(contacts[0].emails).toEqual(["david@test.com"]);
    expect(contacts[0].org).toBe("Goldman Sachs");
    expect(contacts[1].name).toBe("Sarah Levy");
    expect(contacts[1].emails).toEqual([]);
  });

  it("returns empty for insufficient lines", () => {
    expect(parseLinkedInCSV("too\nshort")).toHaveLength(0);
  });
});

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("returns correct distance for simple edits", () => {
    expect(levenshtein("cat", "bat")).toBe(1); // substitution
    expect(levenshtein("cat", "cats")).toBe(1); // insertion
    expect(levenshtein("cats", "cat")).toBe(1); // deletion
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("normPhone", () => {
  it("strips non-digits and keeps last 10", () => {
    expect(normPhone("+1-555-123-4567")).toBe("5551234567");
    expect(normPhone("(555) 123-4567")).toBe("5551234567");
  });

  it("handles international numbers (last 10 digits)", () => {
    // +972-50-123-4567 → 9725012345​67 → last 10 = 2501234567
    expect(normPhone("+972-50-123-4567")).toBe("2501234567");
  });

  it("handles null/empty", () => {
    expect(normPhone(null)).toBe("");
    expect(normPhone("")).toBe("");
  });
});

describe("fuzzyMatchDonor", () => {
  const donors = [
    { name: "David Goldstein", email: "david@test.com", phone: "555-123-4567", id: "d1" },
    { name: "Sarah Roth", email: "sarah@test.com", id: "d2" },
    { name: "Jonathan Cohen", id: "d3" },
  ];

  it("matches by email (highest confidence)", () => {
    const contact = { name: "Dave G", emails: ["david@test.com"], phones: [] };
    const match = fuzzyMatchDonor(contact, donors);
    expect(match).not.toBeNull();
    expect(match.donor.name).toBe("David Goldstein");
    expect(match.matchType).toBe("email");
    expect(match.confidence).toBe(1.0);
  });

  it("matches by phone", () => {
    const contact = { name: "D Gold", emails: [], phones: ["(555) 123-4567"] };
    const match = fuzzyMatchDonor(contact, donors);
    expect(match).not.toBeNull();
    expect(match.matchType).toBe("phone");
    expect(match.confidence).toBe(0.95);
  });

  it("matches by exact name", () => {
    const contact = { name: "Sarah Roth", emails: [], phones: [], first: "Sarah", last: "Roth" };
    const match = fuzzyMatchDonor(contact, donors);
    expect(match).not.toBeNull();
    expect(match.matchType).toBe("name_exact");
  });

  it("returns null for no match", () => {
    const contact = { name: "Unknown Person", emails: ["nobody@test.com"], phones: [] };
    expect(fuzzyMatchDonor(contact, donors)).toBeNull();
  });
});

describe("edgeStrength", () => {
  it("returns 0 for no signals", () => {
    expect(edgeStrength([])).toBe(0);
  });

  it("returns signal weight for single signal", () => {
    expect(edgeStrength([{ weight: 0.5 }])).toBe(0.5);
  });

  it("applies diminishing returns for multiple signals", () => {
    const twoSignals = edgeStrength([{ weight: 0.5 }, { weight: 0.3 }]);
    expect(twoSignals).toBeGreaterThan(0.5);
    expect(twoSignals).toBeLessThan(0.8);
  });

  it("caps at 1.0", () => {
    const manySignals = edgeStrength([
      { weight: 0.9 }, { weight: 0.8 }, { weight: 0.7 }, { weight: 0.6 },
    ]);
    expect(manySignals).toBeLessThanOrEqual(1.0);
  });
});

describe("bfsPath", () => {
  it("finds direct path", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ from: "A", to: "B", strength: 1 }],
    };
    const path = bfsPath(graph, "A", "B");
    expect(path).not.toBeNull();
    expect(path).toHaveLength(1);
  });

  it("finds 2-hop path", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [
        { from: "A", to: "B", strength: 1 },
        { from: "B", to: "C", strength: 1 },
      ],
    };
    const path = bfsPath(graph, "A", "C");
    expect(path).toHaveLength(2);
  });

  it("returns null for unreachable target", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [],
    };
    expect(bfsPath(graph, "A", "B")).toBeNull();
  });

  it("returns empty array for self-path", () => {
    const graph = { nodes: [{ id: "A" }], edges: [] };
    expect(bfsPath(graph, "A", "A")).toEqual([]);
  });

  it("respects 4-hop depth limit", () => {
    // Create a chain: A → B → C → D → E → F (5 hops)
    const graph = {
      nodes: "ABCDEF".split("").map((id) => ({ id })),
      edges: [
        { from: "A", to: "B" }, { from: "B", to: "C" },
        { from: "C", to: "D" }, { from: "D", to: "E" },
        { from: "E", to: "F" },
      ],
    };
    // 4 hops should be reachable
    expect(bfsPath(graph, "A", "E")).toHaveLength(4);
    // 5 hops should NOT be reachable (depth limit)
    expect(bfsPath(graph, "A", "F")).toBeNull();
  });
});
