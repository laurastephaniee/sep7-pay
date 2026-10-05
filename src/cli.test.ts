import { describe, expect, it } from "vitest";
import { run } from "./cli.js";

const DEST = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

async function cli(...args: string[]) {
  const lines: string[] = [];
  const code = await run(args, (l) => lines.push(l));
  return { code, output: lines.join("\n") };
}

describe("cli", () => {
  it("builds a pay URI with an issued asset", async () => {
    const { code, output } = await cli("pay", "--to", DEST, "--amount", "99", "--asset", `USDC:${ISSUER}`);
    expect(code).toBe(0);
    expect(output).toBe(
      `web+stellar:pay?destination=${DEST}&amount=99&asset_code=USDC&asset_issuer=${ISSUER}`,
    );
  });

  it("adds the testnet passphrase and url: callback prefix", async () => {
    const { output } = await cli("pay", "--to", DEST, "--testnet", "--callback", "https://x.example/cb");
    expect(output).toContain("callback=url%3Ahttps%3A%2F%2Fx.example%2Fcb");
    expect(output).toContain("network_passphrase=Test%20SDF%20Network");
  });

  it("verify --json prints a machine-readable result and fails on bad signatures", async () => {
    const { code, output } = await cli("verify", `web+stellar:pay?destination=${DEST}`, "--key", ISSUER, "--json");
    expect(code).toBe(1);
    expect(JSON.parse(output)).toEqual({ valid: false, key: ISSUER });
  });

  it("parses a URI to JSON", async () => {
    const { code, output } = await cli("parse", `web+stellar:pay?destination=${DEST}&amount=3`);
    expect(code).toBe(0);
    expect(JSON.parse(output)).toEqual({ operation: "pay", destination: DEST, amount: "3" });
  });

  it("exits non-zero with a readable error", async () => {
    const { code, output } = await cli("pay", "--to", DEST, "--amount=-1");
    expect(code).toBe(1);
    expect(output).toMatch(/^error: amount must be positive/);
  });

  it("prints help", async () => {
    expect((await cli("--help")).output).toContain("Usage:");
  });
});
