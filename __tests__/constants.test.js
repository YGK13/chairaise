// ============================================================
// ChaiRaise — Constants Tests
// Verify data integrity of all shared constants
// ============================================================
import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATES, STAGES, TIERS, NAV, DONOR_FIELDS,
  FIELD_GROUPS, ACT_TYPES, ORG_TYPES, DEFAULT_ORG,
  EMPTY_ORG_PROFILE, ROLES, TAG_COLORS,
} from "@/lib/constants";

describe("STAGES", () => {
  it("has 10 pipeline stages", () => {
    expect(STAGES).toHaveLength(10);
  });

  it("starts with not_started and ends with commitment", () => {
    expect(STAGES[0].id).toBe("not_started");
    expect(STAGES[9].id).toBe("commitment");
  });

  it("every stage has id, label, color, and order", () => {
    STAGES.forEach((s) => {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof s.order).toBe("number");
    });
  });

  it("stages are in ascending order", () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].order).toBeGreaterThan(STAGES[i - 1].order);
    }
  });
});

describe("TIERS", () => {
  it("has Tier 1, 2, 3", () => {
    expect(TIERS["Tier 1"]).toBeDefined();
    expect(TIERS["Tier 2"]).toBeDefined();
    expect(TIERS["Tier 3"]).toBeDefined();
  });

  it("each tier has label and cls", () => {
    Object.values(TIERS).forEach((t) => {
      expect(t.label).toBeTruthy();
      expect(t.cls).toBeTruthy();
    });
  });
});

describe("NAV", () => {
  it("has 11 items (streamlined from 20)", () => {
    expect(NAV).toHaveLength(11);
  });

  it("starts with dashboard", () => {
    expect(NAV[0].id).toBe("dashboard");
  });

  it("ends with settings", () => {
    expect(NAV[NAV.length - 1].id).toBe("settings");
  });

  it("every item has id, icon, and label", () => {
    NAV.forEach((n) => {
      expect(n.id).toBeTruthy();
      expect(n.icon).toBeTruthy();
      expect(n.label).toBeTruthy();
    });
  });

  it("has no duplicate IDs", () => {
    const ids = NAV.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("DEFAULT_TEMPLATES", () => {
  it("has 6 email templates", () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(6);
  });

  it("every template has id, name, segment, subject, hooks", () => {
    DEFAULT_TEMPLATES.forEach((t) => {
      expect(t.id).toMatch(/^T-[A-F]$/);
      expect(t.name).toBeTruthy();
      expect(t.segment).toBeTruthy();
      expect(t.subject).toContain("{OrgName}");
      expect(t.hooks).toBeTruthy();
    });
  });

  it("no template references hardcoded org names", () => {
    DEFAULT_TEMPLATES.forEach((t) => {
      expect(t.subject).not.toContain("Ohr Vishua");
      expect(t.subject).not.toContain("Haifa");
      expect(t.hooks).not.toContain("Ohr Vishua");
    });
  });
});

describe("DONOR_FIELDS", () => {
  it("has at least 15 fields", () => {
    expect(DONOR_FIELDS.length).toBeGreaterThanOrEqual(15);
  });

  it("name field is required", () => {
    const nameField = DONOR_FIELDS.find((f) => f.key === "name");
    expect(nameField).toBeDefined();
    expect(nameField.required).toBe(true);
  });

  it("every field has key, label, type, group", () => {
    DONOR_FIELDS.forEach((f) => {
      expect(f.key).toBeTruthy();
      expect(f.label).toBeTruthy();
      expect(f.type).toBeTruthy();
      expect(f.group).toBeTruthy();
    });
  });

  it("all groups are defined in FIELD_GROUPS", () => {
    const groupIds = FIELD_GROUPS.map((g) => g.id);
    DONOR_FIELDS.forEach((f) => {
      expect(groupIds).toContain(f.group);
    });
  });
});

describe("ROLES", () => {
  it("has 4 roles", () => {
    expect(ROLES).toHaveLength(4);
  });

  it("admin has 'all' permission", () => {
    const admin = ROLES.find((r) => r.id === "admin");
    expect(admin.perms).toContain("all");
  });

  it("viewer has limited permissions", () => {
    const viewer = ROLES.find((r) => r.id === "viewer");
    expect(viewer.perms).not.toContain("all");
    expect(viewer.perms).toContain("dashboard");
  });
});

describe("DEFAULT_ORG", () => {
  it("uses ChaiRaise as default name (not Ohr Vishua)", () => {
    expect(DEFAULT_ORG.name).toBe("ChaiRaise");
    expect(DEFAULT_ORG.id).toBe("chairaise_default");
    expect(DEFAULT_ORG.logo).toBe("CR");
  });
});

describe("ORG_TYPES", () => {
  it("has at least 8 org types", () => {
    expect(ORG_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it("includes yeshiva, synagogue, and day_school", () => {
    const ids = ORG_TYPES.map((o) => o.id);
    expect(ids).toContain("yeshiva");
    expect(ids).toContain("synagogue");
    expect(ids).toContain("day_school");
  });
});

describe("TAG_COLORS", () => {
  it("has 10 colors", () => {
    expect(TAG_COLORS).toHaveLength(10);
  });

  it("all are valid hex colors", () => {
    TAG_COLORS.forEach((c) => {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
