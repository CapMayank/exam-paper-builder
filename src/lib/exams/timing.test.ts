import { describe, expect, it } from "vitest";
import { minutesBetween } from "./timing";

describe("minutesBetween", () => {
  it("reads the date sheet's time lines", () => {
    expect(minutesBetween("11:00 am to 02:00 pm")).toBe(180);
    expect(minutesBetween("11:00 am to 01:30 pm")).toBe(150);
    expect(minutesBetween("9:30 AM - 12:00 PM")).toBe(150);
    expect(minutesBetween("11 am – 2 pm")).toBe(180);
  });
  it("reads a 24-hour clock", () => {
    expect(minutesBetween("10:00 to 13:00")).toBe(180);
  });
  it("treats an afternoon end without am/pm as later in the day", () => {
    expect(minutesBetween("11:00 to 2:00")).toBe(180);
  });
  it("gives nothing for an unreadable or empty time", () => {
    expect(minutesBetween("")).toBeNull();
    expect(minutesBetween("morning shift")).toBeNull();
    expect(minutesBetween("02:00 pm to 11:00 am")).toBeNull();
    expect(minutesBetween("11:00 am to 11:00 am")).toBeNull();
  });
});
