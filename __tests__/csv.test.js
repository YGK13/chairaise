// ============================================================
// ChaiRaise — CSV Parser Tests
// Verify robust CSV handling (quoted fields, commas, newlines)
// ============================================================
import { describe, it, expect } from "vitest";
import { parseCSV } from "@/lib/csv";

describe("parseCSV", () => {
  it("parses simple CSV", () => {
    const rows = parseCSV("Name,Email,Phone\nJohn,j@t.com,555-1234\nJane,jane@t.com,555-5678");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(["Name", "Email", "Phone"]);
    expect(rows[1]).toEqual(["John", "j@t.com", "555-1234"]);
  });

  it("handles quoted fields with commas", () => {
    const rows = parseCSV('Name,Address\n"Smith, John","123 Main St, Apt 4"');
    expect(rows[1][0]).toBe("Smith, John");
    expect(rows[1][1]).toBe("123 Main St, Apt 4");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const rows = parseCSV('Note\n"He said ""hello"" to me"');
    expect(rows[1][0]).toBe('He said "hello" to me');
  });

  it("handles empty fields", () => {
    const rows = parseCSV("A,B,C\n1,,3\n,2,");
    expect(rows[1]).toEqual(["1", "", "3"]);
    expect(rows[2]).toEqual(["", "2", ""]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCSV("A,B\r\n1,2\r\n3,4");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual(["1", "2"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseCSV("")).toHaveLength(0);
  });

  it("handles single row with no newline", () => {
    const rows = parseCSV("Name,Email");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(["Name", "Email"]);
  });

  it("handles Hebrew column headers", () => {
    const rows = parseCSV("שם,אימייל,סכום\nדוד,d@t.com,1000");
    expect(rows[0][0]).toBe("שם");
    expect(rows[1][0]).toBe("דוד");
  });
});
