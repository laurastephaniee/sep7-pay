import { useEffect, useMemo, useState } from "react";
import { Networks, StrKey } from "@stellar/stellar-sdk";
import { buildUri, memoRequired, parseUri, Sep7Error, verifyUri, type MemoType, type PayRequest, type Sep7Request } from "../../src/sep7";
import { toQrSvg } from "../../src/qr";

const ASSETS: Record<string, { code?: string; issuer?: string; label: string }> = {
  xlm: { label: "XLM (native)" },
  usdc: { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", label: "USDC (testnet, Circle)" },
  usdcmain: { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", label: "USDC (mainnet, Circle)" },
  custom: { label: "Other asset…" },
};

type Tab = "build" | "inspect";

export function Workspace() {
  const [tab, setTab] = useState<Tab>("build");
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <nav className="flex gap-2">
          {(["build", "inspect"] as const).map((t) => (
            <button key={t} className={`press ${tab === t ? "press-dark" : ""}`} onClick={() => setTab(t)}>
              {t === "build" ? "Make a link" : "Inspect a link"}
            </button>
          ))}
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <h1 className="max-w-4xl text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
          Get paid in XLM or USDC with one link.
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-medium text-graphite">
          Build SEP-7 payment requests that Stellar wallets open pre-filled. Put the QR on an invoice, a menu or a
          market stall. Everything is validated before your customer sees it.
        </p>
      </section>
      <div className="mx-auto max-w-6xl px-5 pb-16">{tab === "build" ? <Builder /> : <Inspector />}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs font-bold text-signal">{error}</span>}
    </label>
  );
}

// Merchants reuse the same destination and asset, so remember them in this browser.
const SAVED_KEY = "sep7pay.builder";
interface Saved {
  destination: string;
  asset: string;
  code: string;
  issuer: string;
  memoType: MemoType;
  testnet: boolean;
}
function loadSaved(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}") as Partial<Saved>;
  } catch {
    return {};
  }
}

function Builder() {
  const [saved] = useState(loadSaved);
  const [destination, setDestination] = useState(saved.destination ?? "");
  const [amount, setAmount] = useState("25");
  const [asset, setAsset] = useState(saved.asset && saved.asset in ASSETS ? saved.asset : "xlm");
  const [code, setCode] = useState(saved.code ?? "");
  const [issuer, setIssuer] = useState(saved.issuer ?? "");
  const [memo, setMemo] = useState("");
  const [memoType, setMemoType] = useState<MemoType>(saved.memoType ?? "MEMO_TEXT");
  const [msg, setMsg] = useState("");
  const [testnet, setTestnet] = useState(saved.testnet ?? true);
  useEffect(() => {
    try {
      const data: Saved = { destination, asset, code, issuer, memoType, testnet };
      localStorage.setItem(SAVED_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable: nothing to remember */
    }
  }, [destination, asset, code, issuer, memoType, testnet]);
  const forget = () => {
    try {
      localStorage.removeItem(SAVED_KEY);
    } catch {
      /* ignore */
    }
    setDestination("");
    setAsset("xlm");
    setCode("");
    setIssuer("");
    setMemoType("MEMO_TEXT");
    setTestnet(true);
  };
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const req: PayRequest = { operation: "pay", destination: destination.trim() };
    if (amount) req.amount = amount.trim();
    const a = ASSETS[asset];
    if (asset === "custom") {
      if (code || issuer) {
        req.assetCode = code.trim();
        req.assetIssuer = issuer.trim();
      }
    } else if (a.code) {
      req.assetCode = a.code;
      req.assetIssuer = a.issuer;
    }
    if (memo) {
      req.memo = memo;
      req.memoType = memoType;
    }
    if (msg) req.msg = msg;
    if (testnet) req.networkPassphrase = Networks.TESTNET;
    try {
      return { uri: buildUri(req), error: null as Sep7Error | null };
    } catch (e) {
      return { uri: "", error: e instanceof Sep7Error ? e : new Sep7Error(String(e)) };
    }
  }, [destination, amount, asset, code, issuer, memo, memoType, msg, testnet]);

  useEffect(() => {
    if (result.uri) toQrSvg(result.uri).then(setSvg);
    else setSvg("");
  }, [result.uri]);

  const err = (f: string) => (result.error?.field === f && destination ? result.error.message : null);

  // SEP-29: exchange deposit addresses flag that payments need a memo.
  const [needsMemo, setNeedsMemo] = useState(false);
  useEffect(() => {
    const dest = destination.trim();
    setNeedsMemo(false);
    if (!StrKey.isValidEd25519PublicKey(dest)) return;
    const horizon = testnet ? "https://horizon-testnet.stellar.org" : "https://horizon.stellar.org";
    let live = true;
    fetch(`${horizon}/accounts/${dest}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((account) => live && setNeedsMemo(memoRequired(account)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [destination, testnet]);
  const save = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  };
  const download = () => save(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), "payment-qr.svg");
  // Print-friendly PNG: render the SVG onto a 1024px canvas with a white background.
  const downloadPng = () => {
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, size, size);
      save(canvas.toDataURL("image/png"), "payment-qr.png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <form className="slab space-y-4 p-6" onSubmit={(e) => e.preventDefault()}>
        <Field label="Pay to (G… or M… address)" error={err("destination")}>
          <input className={`entry font-mono text-xs ${err("destination") ? "bad" : ""}`} placeholder="GB…" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (blank = payer chooses)" error={err("amount")}>
            <input className={`entry ${err("amount") ? "bad" : ""}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Asset">
            <select className="entry" value={asset} onChange={(e) => setAsset(e.target.value)}>
              {Object.entries(ASSETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {asset === "custom" && (
          <div className="grid grid-cols-[120px_1fr] gap-4">
            <Field label="Code" error={err("assetCode")}>
              <input className="entry" value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <Field label="Issuer" error={err("assetIssuer")}>
              <input className="entry font-mono text-xs" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
            </Field>
          </div>
        )}
        {needsMemo && !memo.trim() && (
          <p className="border-2 border-signal bg-white p-3 text-sm font-bold text-signal" role="alert">
            This account requires a memo (it sets SEP-29 config.memo_required, as exchanges do). Without one, a payment may
            never be credited. Add the memo the recipient gave you.
          </p>
        )}
        <div className="grid grid-cols-[1fr_160px] gap-4">
          <Field label="Memo (invoice no., reference…)" error={err("memo")}>
            <input className="entry" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>
          <Field label="Memo type">
            <select className="entry" value={memoType} onChange={(e) => setMemoType(e.target.value as MemoType)}>
              {["MEMO_TEXT", "MEMO_ID", "MEMO_HASH", "MEMO_RETURN"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={`Message to payer (${msg.length}/300)`} error={err("msg")}>
          <input className="entry" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Invoice #42 · Thanks!" />
        </Field>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={testnet} onChange={(e) => setTestnet(e.target.checked)} /> Testnet request
        </label>
        {result.error && destination && !result.error.field && <p className="font-bold text-signal">{result.error.message}</p>}
        <p className="text-xs text-graphite">
          Destination, asset and network are remembered in this browser.{" "}
          <button type="button" className="font-bold underline" onClick={forget}>
            Forget them
          </button>
        </p>
      </form>

      <div className="slab print-card flex flex-col items-center p-6">
        {svg ? (
          <>
            <div className="w-full max-w-[300px] border-3 border-tar bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-3 text-center text-sm font-bold">
              {amount || "Any amount"} {asset === "custom" ? code : ASSETS[asset].code ?? "XLM"}
              {msg && ` · ${msg}`}
            </p>
            {memo && <p className="text-center text-xs font-bold">Memo: {memo}</p>}
            <code className="mt-4 block w-full break-all border-2 border-tar bg-white p-3 font-mono text-xs">{result.uri}</code>
            <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
              <button
                className="press press-dark"
                onClick={() => navigator.clipboard.writeText(result.uri).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)))}
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <button className="press" onClick={download}>
                SVG
              </button>
              <button className="press" onClick={downloadPng}>
                PNG
              </button>
              <button className="press" onClick={() => window.print()}>
                Print card
              </button>
              <a className="press" href={result.uri}>
                Open in wallet
              </a>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="h-40 w-40 border-3 border-dashed border-tar" />
            <p className="mt-4 max-w-xs font-medium text-graphite">Enter a destination address and your QR code appears here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  operation: "Operation",
  destination: "Destination",
  amount: "Amount",
  assetCode: "Asset code",
  assetIssuer: "Asset issuer",
  memo: "Memo",
  memoType: "Memo type",
  callback: "Callback",
  msg: "Message",
  networkPassphrase: "Network",
  originDomain: "Origin domain",
  signature: "Signature",
  xdr: "Transaction XDR",
  pubkey: "Signer",
};

function Inspector() {
  const [uri, setUri] = useState("");
  const [key, setKey] = useState("");
  const parsed = useMemo((): { req?: Sep7Request; error?: string } => {
    if (!uri.trim()) return {};
    try {
      return { req: parseUri(uri.trim()) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [uri]);
  const verified = parsed.req?.signature && key ? verifyUri(uri.trim(), key.trim()) : null;

  return (
    <div className="slab p-6">
      <Field label="Paste a web+stellar: link">
        <textarea className="entry h-28 font-mono text-xs" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="web+stellar:pay?destination=…" />
      </Field>
      {parsed.error && <p className="mt-4 border-2 border-signal bg-white p-3 font-bold text-signal">✗ {parsed.error}</p>}
      {parsed.req && (
        <>
          <p className="mt-4 border-2 border-leaf bg-white p-3 font-bold text-leaf">✓ Valid SEP-7 {parsed.req.operation} request</p>
          <table className="mt-4 w-full border-2 border-tar bg-white text-sm">
            <tbody>
              {Object.entries(parsed.req).map(([k, v]) => (
                <tr key={k} className="border-b border-tar/20">
                  <th className="w-44 p-2 text-left align-top lbl">{LABELS[k] ?? k}</th>
                  <td className="break-all p-2 font-mono text-xs">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.req.signature && (
            <div className="mt-5">
              <Field label={`Verify against ${parsed.req.originDomain}'s URI_REQUEST_SIGNING_KEY`}>
                <input className="entry font-mono text-xs" placeholder="G… signing key from stellar.toml" value={key} onChange={(e) => setKey(e.target.value)} />
              </Field>
              {verified !== null && (
                <p className={`mt-2 font-bold ${verified ? "text-leaf" : "text-signal"}`}>{verified ? "✓ Signature valid" : "✗ Signature does NOT match this key"}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
