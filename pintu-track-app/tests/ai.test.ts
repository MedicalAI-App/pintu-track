import { describe, expect, test } from "vitest";
import { buildParsePrompt, parseAiJson } from "@/lib/ai";

describe("buildParsePrompt", () => {
  test("memuat teks user dan daftar kategori", () => {
    const p = buildParsePrompt("traktir temen ngopi 85 ribu");
    expect(p).toContain("traktir temen ngopi 85 ribu");
    expect(p).toContain("Makanan & Minuman");
    expect(p).toContain("Gaji");
    expect(p).toContain("JSON");
  });
});

describe("parseAiJson", () => {
  test("JSON valid expense → normal", () => {
    expect(
      parseAiJson(
        '{"type":"expense","amount":85000,"description":"Traktir ngopi","category":"Makanan & Minuman"}'
      )
    ).toEqual({
      type: "expense",
      amount: 85000,
      description: "Traktir ngopi",
      category: "Makanan & Minuman",
    });
  });
  test("JSON dibungkus markdown fence tetap terbaca", () => {
    const r = parseAiJson(
      '```json\n{"type":"income","amount":500000,"description":"Jual barang","category":"Lainnya"}\n```'
    );
    expect(r?.type).toBe("income");
    expect(r?.amount).toBe(500000);
  });
  test("kategori asing dipetakan ke Lainnya", () => {
    const r = parseAiJson(
      '{"type":"expense","amount":10000,"description":"X","category":"Jajan Random"}'
    );
    expect(r?.category).toBe("Lainnya");
  });
  test("kategori income tidak valid → Lainnya", () => {
    const r = parseAiJson(
      '{"type":"income","amount":10000,"description":"X","category":"Transportasi"}'
    );
    expect(r?.category).toBe("Lainnya");
  });
  test("amount nol / negatif / non-angka → null", () => {
    expect(parseAiJson('{"type":"expense","amount":0,"description":"X","category":"Lainnya"}')).toBeNull();
    expect(parseAiJson('{"type":"expense","amount":-5,"description":"X","category":"Lainnya"}')).toBeNull();
    expect(parseAiJson('{"type":"expense","amount":"abc","description":"X","category":"Lainnya"}')).toBeNull();
  });
  test("amount desimal dibulatkan", () => {
    expect(
      parseAiJson('{"type":"expense","amount":10000.6,"description":"X","category":"Lainnya"}')?.amount
    ).toBe(10001);
  });
  test("type null (bukan transaksi) → null", () => {
    expect(parseAiJson('{"type":null}')).toBeNull();
  });
  test("type saving tidak diizinkan → null", () => {
    expect(
      parseAiJson('{"type":"saving_deposit","amount":10000,"description":"X","category":"Tabungan"}')
    ).toBeNull();
  });
  test("bukan JSON → null", () => {
    expect(parseAiJson("maaf, saya tidak mengerti")).toBeNull();
  });
  test("description kosong → dipakai 'Transaksi'", () => {
    expect(
      parseAiJson('{"type":"expense","amount":5000,"description":"","category":"Lainnya"}')?.description
    ).toBe("Transaksi");
  });
});
