import { describe, expect, it } from "vitest";
import { formatAbn, isValidAbn } from "./abn";

describe("isValidAbn", () => {
  it("accepts valid ABNs, with or without spaces", () => {
    expect(isValidAbn("51 824 753 556")).toBe(true); // ATO's published example
    expect(isValidAbn("53004085616")).toBe(true);
  });
  it("rejects bad checksums and malformed input", () => {
    expect(isValidAbn("51824753557")).toBe(false);
    expect(isValidAbn("1234")).toBe(false);
    expect(isValidAbn("abcdefghijk")).toBe(false);
  });
  it("formats as 2-3-3-3", () => expect(formatAbn("51824753556")).toBe("51 824 753 556"));
});
