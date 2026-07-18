import { describe, expect, test } from "vitest";
import { parseQuickInput, parseTransfer } from "@/lib/parse";

describe("income", () => {
  test("gajian 5jt → income kategori Gaji", () => {
    const p = parseQuickInput("gajian 5jt");
    expect(p.type).toBe("income");
    expect(p.amount).toBe(5_000_000);
    expect(p.category).toBe("Gaji");
  });
  test("dapat bonus thr 2jt → income kategori Bonus", () => {
    const p = parseQuickInput("dapat bonus thr 2jt");
    expect(p.type).toBe("income");
    expect(p.category).toBe("Bonus");
  });
  test("terima transferan 300rb → income Lainnya", () => {
    const p = parseQuickInput("terima transferan 300rb");
    expect(p.type).toBe("income");
    expect(p.category).toBe("Lainnya");
  });
  test("makan siang 30rb tetap expense", () => {
    const p = parseQuickInput("makan siang 30rb");
    expect(p.type).toBe("expense");
    expect(p.category).toBe("Makanan & Minuman");
    expect(p.pocketQuery).toBeNull();
  });
});

describe("kantong", () => {
  test("nabung 100rb liburan → saving_deposit + pocketQuery", () => {
    const p = parseQuickInput("nabung 100rb liburan");
    expect(p.type).toBe("saving_deposit");
    expect(p.amount).toBe(100_000);
    expect(p.pocketQuery).toBe("liburan");
  });
  test("ambil 50rb dari liburan → saving_withdrawal", () => {
    const p = parseQuickInput("ambil 50rb dari liburan");
    expect(p.type).toBe("saving_withdrawal");
    expect(p.pocketQuery).toBe("liburan");
  });
  test("tabung 25.000 dana darurat → deposit multi-kata", () => {
    const p = parseQuickInput("tabung 25.000 dana darurat");
    expect(p.type).toBe("saving_deposit");
    expect(p.pocketQuery).toBe("dana darurat");
  });
  test("topup liburan 100rb → saving_topup", () => {
    const p = parseQuickInput("topup liburan 100rb");
    expect(p.type).toBe("saving_topup");
    expect(p.amount).toBe(100_000);
    expect(p.pocketQuery).toBe("liburan");
  });
  test("isi 50rb ke dana darurat → saving_topup", () => {
    const p = parseQuickInput("isi 50rb ke dana darurat");
    expect(p.type).toBe("saving_topup");
    expect(p.pocketQuery).toBe("dana darurat");
  });
});

describe("parseTransfer", () => {
  test("transfer 50rb dari liburan ke darurat", () => {
    expect(parseTransfer("transfer 50rb dari liburan ke darurat")).toEqual({
      amount: 50_000,
      fromQuery: "liburan",
      toQuery: "darurat",
    });
  });
  test("pindah 1,5jt dari dana darurat ke liburan (multi-kata)", () => {
    expect(parseTransfer("pindah 1,5jt dari dana darurat ke liburan")).toEqual({
      amount: 1_500_000,
      fromQuery: "dana darurat",
      toQuery: "liburan",
    });
  });
  test("tanpa 'dari/ke' → null", () => {
    expect(parseTransfer("transfer 50rb liburan")).toBeNull();
  });
  test("tanpa nominal → null", () => {
    expect(parseTransfer("transfer dari liburan ke darurat")).toBeNull();
  });
  test("bukan perintah transfer → null", () => {
    expect(parseTransfer("makan siang 30rb")).toBeNull();
  });
});
