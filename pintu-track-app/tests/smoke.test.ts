import { expect, test } from "vitest";
import { formatRupiah } from "@/lib/format";

test("alias @ dan vitest berfungsi", () => {
  expect(formatRupiah(15000)).toContain("15.000");
});
