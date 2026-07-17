import { describe, expect, test } from "vitest";
import { parseReminder } from "@/lib/parse";

describe("parseReminder", () => {
  test("ingatkan kos 1,5jt tiap tanggal 1", () => {
    expect(parseReminder("ingatkan kos 1,5jt tiap tanggal 1")).toEqual({
      description: "kos",
      amount: 1_500_000,
      dayOfMonth: 1,
    });
  });
  test("ingatkan bayar wifi 250rb setiap tgl 25", () => {
    expect(parseReminder("ingatkan bayar wifi 250rb setiap tgl 25")).toEqual({
      description: "bayar wifi",
      amount: 250_000,
      dayOfMonth: 25,
    });
  });
  test("tanpa nominal → null", () => {
    expect(parseReminder("ingatkan listrik tanggal 5")).toBeNull();
  });
  test("tanpa kata tanggal → null", () => {
    expect(parseReminder("ingatkan listrik 200rb")).toBeNull();
  });
  test("tanggal di luar 1-31 → null", () => {
    expect(parseReminder("ingatkan kos 1jt tiap tanggal 32")).toBeNull();
  });
  test("bukan perintah ingatkan → null", () => {
    expect(parseReminder("makan siang 30rb")).toBeNull();
  });
});
