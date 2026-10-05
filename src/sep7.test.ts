import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { buildUri, parseUri, Sep7Error, signUri, verifyUri, type PayRequest } from "./sep7.js";

const DEST = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const pay = (extra: Partial<PayRequest> = {}): PayRequest => ({
  operation: "pay",
  destination: DEST,
  ...extra,
});

describe("buildUri / parseUri", () => {
  it("builds a minimal pay URI", () => {
    expect(buildUri(pay())).toBe(`web+stellar:pay?destination=${DEST}`);
  });

  it("round-trips every pay field, percent-encoding values", () => {
    const request = pay({
      amount: "120.1234567",
      assetCode: "USDC",
      assetIssuer: ISSUER,
      memo: "invoice 42",
      memoType: "MEMO_TEXT",
      callback: "url:https://shop.example/hook?order=42",
      msg: "Order #42 — thanks & enjoy",
      networkPassphrase: Networks.TESTNET,
    });
    const uri = buildUri(request);
    expect(uri).toContain("msg=Order%20%2342%20%E2%80%94%20thanks%20%26%20enjoy");
    expect(parseUri(uri)).toEqual(request);
  });

  it("decodes + as a space for URIs produced by form encoders", () => {
    const parsed = parseUri(`web+stellar:pay?destination=${DEST}&msg=hello+there`);
    expect(parsed.msg).toBe("hello there");
  });

  it("round-trips a tx request", () => {
    const tx = new TransactionBuilder(new Account(DEST, "1"), {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({ destination: ISSUER, asset: Asset.native(), amount: "1" }))
      .setTimeout(300)
      .build();
    const request = {
      operation: "tx" as const,
      xdr: tx.toXDR(),
      networkPassphrase: Networks.TESTNET,
      pubkey: DEST,
    };
    expect(parseUri(buildUri(request))).toEqual(request);
  });

  it("round-trips a tx request with replace", () => {
    const tx = new TransactionBuilder(new Account(DEST, "1"), {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({ destination: ISSUER, asset: Asset.native(), amount: "1" }))
      .setTimeout(300)
      .build();
    const request = {
      operation: "tx" as const,
      xdr: tx.toXDR(),
      replace: "sourceAccount:X,operations[0].destination:Y;X:account paying the fee,Y:who gets paid",
      networkPassphrase: Networks.TESTNET,
    };
    const uri = buildUri(request);
    expect(uri).toContain("&replace=sourceAccount%3AX");
    expect(parseUri(uri)).toEqual(request);
  });

  it("rejects malformed replace values with a field-specific error", () => {
    const tx = new TransactionBuilder(new Account(DEST, "1"), { fee: "100", networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.payment({ destination: ISSUER, asset: Asset.native(), amount: "1" }))
      .setTimeout(300)
      .build();
    const bad = (replace: string) => () =>
      buildUri({ operation: "tx", xdr: tx.toXDR(), networkPassphrase: Networks.TESTNET, replace });
    for (const value of ["sourceAccount:X", "sourceAccount:X;", "source Account:X;X:fee", "sourceAccount:X;Y:other"]) {
      expect(bad(value)).toThrowError(Sep7Error);
      try {
        bad(value)();
      } catch (e) {
        expect((e as Sep7Error).field).toBe("replace");
      }
    }
  });
});

describe("validation", () => {
  const bad: [string, Partial<PayRequest>, string][] = [
    ["bad destination", { destination: "GNOPE" }, "destination"],
    ["contract destination", { destination: "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE" }, "destination"],
    ["zero amount", { amount: "0" }, "amount"],
    ["negative amount", { amount: "-1" }, "amount"],
    ["8 decimals", { amount: "1.00000001" }, "amount"],
    ["asset code without issuer", { assetCode: "USDC" }, "assetIssuer"],
    ["issuer without code", { assetIssuer: ISSUER }, "assetCode"],
    ["13-char asset code", { assetCode: "ABCDEFGHIJKLM", assetIssuer: ISSUER }, "assetCode"],
    ["memo text over 28 bytes", { memo: "x".repeat(29) }, "memo"],
    ["multi-byte memo over 28 bytes", { memo: "é".repeat(15) }, "memo"],
    ["memo id not a number", { memo: "abc", memoType: "MEMO_ID" }, "memo"],
    ["memo id over u64", { memo: "18446744073709551616", memoType: "MEMO_ID" }, "memo"],
    ["memo hash wrong length", { memo: "AAAA", memoType: "MEMO_HASH" }, "memo"],
    ["memo type without memo", { memoType: "MEMO_ID" }, "memoType"],
    ["msg too long", { msg: "x".repeat(301) }, "msg"],
    ["callback without url: prefix", { callback: "https://x.example" }, "callback"],
    ["origin domain not a domain", { originDomain: "localhost" }, "originDomain"],
  ];

  it.each(bad)("rejects %s", (_name, extra, field) => {
    try {
      buildUri(pay(extra));
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(Sep7Error);
      expect((err as Sep7Error).field).toBe(field);
    }
  });

  it("accepts muxed destinations, MEMO_ID and a 32-byte MEMO_HASH", () => {
    const muxed = "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAACJUQ";
    expect(() => buildUri(pay({ destination: muxed }))).not.toThrow();
    expect(() => buildUri(pay({ memo: "18446744073709551615", memoType: "MEMO_ID" }))).not.toThrow();
    const hash = Buffer.alloc(32, 7).toString("base64");
    expect(() => buildUri(pay({ memo: hash, memoType: "MEMO_HASH" }))).not.toThrow();
  });

  it("rejects malformed URIs", () => {
    expect(() => parseUri("https://example.com")).toThrow(Sep7Error);
    expect(() => parseUri("web+stellar:refund?destination=" + DEST)).toThrow(/unsupported operation/);
    expect(() => parseUri("web+stellar:pay?amount=1")).toThrow(/requires destination/);
    expect(() => parseUri("web+stellar:tx?xdr=not-xdr")).toThrow(/xdr/);
    expect(() => parseUri(`web+stellar:pay?destination=${DEST}&amount=1&amount=2`)).toThrow(/duplicate/);
  });
});

describe("request signing", () => {
  const signer = Keypair.random();

  it("signs and verifies against the origin's signing key", () => {
    const uri = signUri(pay({ amount: "5", msg: "Order 7" }), "shop.example", signer);
    expect(uri).toMatch(/&origin_domain=shop\.example&signature=/);
    expect(verifyUri(uri, signer.publicKey())).toBe(true);
  });

  it("rejects a tampered URI", () => {
    const uri = signUri(pay({ amount: "5" }), "shop.example", signer);
    expect(verifyUri(uri.replace("amount=5", "amount=500"), signer.publicKey())).toBe(false);
  });

  it("rejects a signature from a different key", () => {
    const uri = signUri(pay({ amount: "5" }), "shop.example", signer);
    expect(verifyUri(uri, Keypair.random().publicKey())).toBe(false);
  });

  it("reports unsigned URIs as not verified", () => {
    expect(verifyUri(buildUri(pay()), signer.publicKey())).toBe(false);
  });
});
