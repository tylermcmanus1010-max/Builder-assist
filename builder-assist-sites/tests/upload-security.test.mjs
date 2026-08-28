import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { hasExpectedFileSignature, safeStorageFilename, validIdempotencyKey } from "../lib/upload-security.ts";

const nextConfig = fs.readFileSync("next.config.ts", "utf8");

test("upload signatures accept valid headers and reject disguised content", async () => {
  assert.equal(await hasExpectedFileSignature(new Blob([new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31])]),"pdf"),true);
  assert.equal(await hasExpectedFileSignature(new Blob(["<script>alert(1)</script>"]),"pdf"),false);
  assert.equal(await hasExpectedFileSignature(new Blob([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])]),"png"),true);
  assert.equal(await hasExpectedFileSignature(new Blob([new Uint8Array([0xff,0xd8,0xff,0xe0])]),"jpg"),true);
  assert.equal(await hasExpectedFileSignature(new Blob(["0\nSECTION\n2\nHEADER\n"]),"dxf"),true);
  assert.equal(await hasExpectedFileSignature(new Blob(["not a drawing"]),"dxf"),false);
});

test("idempotency and storage names are bounded and opaque-key compatible", () => {
  assert.equal(validIdempotencyKey("123e4567-e89b-12d3-a456-426614174000"),true);
  assert.equal(validIdempotencyKey("short"),false);
  assert.equal(validIdempotencyKey("x".repeat(129)),false);
  assert.equal(safeStorageFilename("../../permit set\r\n.pdf"),"permit-set-.pdf");
  assert.equal(safeStorageFilename("💥"),"upload");
  assert.ok(safeStorageFilename("a".repeat(500)).length <= 180);
});

test("the runtime multipart guard admits the bounded 80 MB plan-set workflow", () => {
  assert.match(nextConfig, /bodySizeLimit: "85mb"/);
  assert.match(nextConfig, /above Gen1's 80 MB plan-set limit/);
});
