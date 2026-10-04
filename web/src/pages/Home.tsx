import { useEffect, useState } from "react";
import { buildUri } from "../../../src/sep7";
import { toQrSvg } from "../../../src/qr";

const DEMO_URI = buildUri({
  operation: "pay",
  destination: "GDNWGX5WQ4P74MAFOEE2NRF2LB2NS6TTVSA54HFC7M3XSEKL2GRDOYXS",
  amount: "4.50",
  msg: "Flat white, table 7",
});
import { Link, useTitle } from "../lib/router";

export function Home() {
  useTitle("sep7-pay · Stellar payment links and QR codes");
  const [svg, setSvg] = useState("");
  useEffect(() => {
    toQrSvg(DEMO_URI).then(setSvg).catch(() => {});
  }, []);
  const STATS: [string, string][] = [
    ["Standard", "SEP-7"],
    ["Assets", "XLM, USDC, any"],
    ["Server", "none"],
  ];
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.2fr_1fr] md:pt-20">
        <div>
          <p className="lbl text-signal">SEP-7 payment requests</p>
          <h1 className="mt-4 text-5xl leading-[1.03] md:text-6xl font-bold tracking-tight text-tar">Get paid with <span className="bg-tar px-2 text-volt">one link</span>.</h1>
          <p className="mt-6 max-w-xl text-lg text-graphite">Turn an amount, an asset and a note into a web+stellar link and QR code that Stellar wallets open pre-filled. Validated before your customer sees it, and signed if you want proof it came from you.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app" className="press press-dark inline-block">Make a payment link →</Link>
            <Link to="/docs" className="press inline-block">How it works</Link>
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {STATS.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-wider text-graphite">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-tar">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="slab p-7">
          <p className="lbl">Scan me · testnet demo</p>
          <div
            className="mx-auto mt-4 max-w-[260px] border-[3px] border-tar bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="mt-4 break-all border-2 border-tar bg-white p-2 font-mono text-[11px]">{DEMO_URI}</p>
          <p className="mt-3 text-sm text-graphite">4.50 XLM with a note for the payer. Any SEP-7 wallet opens it pre-filled.</p>
        </div>
      </section>

      <section className="border-y-[3px] border-tar bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="lbl text-signal">How it works</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-tar">Ask, scan, paid</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="slab p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold bg-tar text-volt">{i + 1}</span>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-tar">{title}</h3>
                <p className="mt-2 text-sm text-graphite">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="lbl text-signal">Use cases</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-tar">Anywhere you’d hand someone an invoice</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USES.map(([icon, title, body]) => (
            <div key={title} className="slab p-6">
              <span className="text-3xl">{icon}</span>
              <h3 className="mt-3 text-lg font-bold tracking-tight text-tar">{title}</h3>
              <p className="mt-2 text-sm text-graphite">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5">
        <p className="lbl text-signal">Guarantees</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-tar">Correct before it reaches a wallet</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PROMISES.map(([title, body]) => (
            <div key={title} className="rounded-2xl p-7 border-[3px] border-tar bg-tar text-volt">
              <h3 className="text-xl font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-paper/80">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-20">
        <div className="slab flex flex-col items-start justify-between gap-6 p-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-tar">Make your first payment link.</h2>
            <p className="mt-2 text-graphite">No wallet needed to create one, just the Stellar address you want to be paid to.</p>
          </div>
          <Link to="/app" className="press press-dark inline-block shrink-0">Make a payment link →</Link>
        </div>
      </section>
    </>
  );
}

const STEPS: [string, string][] = [
  [
    "Describe the payment",
    "Destination, amount, asset (XLM, USDC or any issued asset), memo and a note for the payer."
  ],
  [
    "Share the link or QR",
    "Print it on an invoice, show it at the till or send it in a chat. No server, no checkout page."
  ],
  [
    "The wallet does the rest",
    "The payer’s wallet opens the request pre-filled; they review and sign. Funds go straight to you."
  ]
];

const USES: [string, string, string][] = [
  [
    "☕",
    "Counters & stalls",
    "A printed QR at the till for a fixed price, or a fresh one per order."
  ],
  [
    "🧾",
    "Invoices",
    "Add a pay link to PDFs and emails with the exact amount and memo."
  ],
  [
    "🎟️",
    "Events",
    "Ticket links that pre-fill the asset, the price and a reference memo."
  ],
  [
    "🤖",
    "Bots & CLIs",
    "Generate requests from code with the library or the command line."
  ]
];

const PROMISES: [string, string][] = [
  [
    "Validated fields",
    "Addresses, amounts, asset codes, memo types and message length are checked against the SEP-7 rules."
  ],
  [
    "Signed requests",
    "Sign with your domain’s key so wallets can show the request really came from you."
  ],
  [
    "Same code everywhere",
    "The web app, the CLI and the npm library share one implementation."
  ]
];
