import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { buildUri, parseUri, Sep7Error, verifyUri, type MemoType, type PayRequest } from "./sep7.js";
import { toQrSvg, toQrTerminal } from "./qr.js";

const HELP = `sep7-pay — Stellar SEP-7 payment request links

Usage:
  sep7-pay pay --to <G…|M…> [--amount 25.5] [--asset CODE:ISSUER]
               [--memo text] [--memo-type MEMO_TEXT|MEMO_ID|MEMO_HASH|MEMO_RETURN]
               [--msg "Invoice #42"] [--callback https://…] [--testnet]
               [--qr] [--svg out.svg]
  sep7-pay parse <uri>                 print a URI's fields as JSON
  sep7-pay verify <uri> --key <G…>     check a signed URI against a signing key

Examples:
  sep7-pay pay --to GABC… --amount 10 --msg "Coffee" --qr
  sep7-pay pay --to GABC… --amount 99 --asset USDC:GA5Z… --svg invoice.svg
`;

const TESTNET = "Test SDF Network ; September 2015";

export async function run(argv: string[], out: (line: string) => void = console.log): Promise<number> {
  const [command, ...rest] = argv;
  try {
    switch (command) {
      case "pay":
        return await pay(rest, out);
      case "parse": {
        const uri = rest[0];
        if (!uri) throw new Sep7Error("parse needs a URI");
        out(JSON.stringify(parseUri(uri), null, 2));
        return 0;
      }
      case "verify": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: { key: { type: "string" } },
          allowPositionals: true,
        });
        if (!positionals[0] || !values.key) throw new Sep7Error("verify needs <uri> --key <G…>");
        const ok = verifyUri(positionals[0], values.key);
        out(ok ? "valid signature" : "INVALID signature");
        return ok ? 0 : 1;
      }
      case undefined:
      case "-h":
      case "--help":
        out(HELP);
        return 0;
      default:
        throw new Sep7Error(`unknown command "${command}"`);
    }
  } catch (err) {
    out(`error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

async function pay(args: string[], out: (line: string) => void): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      to: { type: "string" },
      amount: { type: "string" },
      asset: { type: "string" },
      memo: { type: "string" },
      "memo-type": { type: "string" },
      msg: { type: "string" },
      callback: { type: "string" },
      testnet: { type: "boolean", default: false },
      qr: { type: "boolean", default: false },
      svg: { type: "string" },
    },
  });
  if (!values.to) throw new Sep7Error("pay needs --to <address>");

  const request: PayRequest = { operation: "pay", destination: values.to };
  if (values.amount) request.amount = values.amount;
  if (values.asset) {
    const [code, issuer] = values.asset.split(":");
    request.assetCode = code;
    request.assetIssuer = issuer;
  }
  if (values.memo) request.memo = values.memo;
  if (values["memo-type"]) request.memoType = values["memo-type"] as MemoType;
  if (values.msg) request.msg = values.msg;
  if (values.callback) request.callback = `url:${values.callback}`;
  if (values.testnet) request.networkPassphrase = TESTNET;

  const uri = buildUri(request);
  out(uri);
  if (values.qr) out(await toQrTerminal(uri));
  if (values.svg) {
    writeFileSync(values.svg, await toQrSvg(uri));
    out(`QR code written to ${values.svg}`);
  }
  return 0;
}
