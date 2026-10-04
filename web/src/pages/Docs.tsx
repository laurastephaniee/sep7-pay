import { Link, useTitle } from "../lib/router";

const SECTIONS = [
  ["start", "Getting started"],
  ["concepts", "Concepts"],
  ["reference", "Library & CLI"],
  ["faq", "FAQ"],
] as const;

export function Docs() {
  useTitle("Docs · sep7-pay");
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[210px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1 text-sm">
          <p className="mb-3 px-3 lbl text-signal">On this page</p>
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href="#/docs"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="block rounded-lg px-3 py-2 border-transparent text-tar hover:border-tar"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="min-w-0 space-y-16">
        <header>
          <p className="lbl text-signal">Documentation</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-tar">Using sep7-pay</h1>
          <p className="mt-4 max-w-2xl text-lg text-graphite">A TypeScript library, CLI and web app for building, parsing, signing and verifying SEP-7 web+stellar payment requests.</p>
        </header>

        <section id="start" className="scroll-mt-24 space-y-5">
          <h2 className="text-3xl font-bold tracking-tight text-tar">Getting started</h2>
          <ol className="space-y-3">
            {START.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-tar text-volt">{i + 1}</span>
                <p className="pt-0.5 text-tar">{step}</p>
              </li>
            ))}
          </ol>
          <Link to="/app" className="press press-dark inline-block inline-block">Make a payment link →</Link>
        </section>

        <section id="concepts" className="scroll-mt-24 space-y-5">
          <h2 className="text-3xl font-bold tracking-tight text-tar">Concepts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {CONCEPTS.map(([term, body]) => (
              <div key={term} className="slab p-5">
                <h3 className="text-lg font-bold tracking-tight text-tar">{term}</h3>
                <p className="mt-1.5 text-sm text-graphite">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="reference" className="scroll-mt-24 space-y-5">
          <h2 className="text-3xl font-bold tracking-tight text-tar">Library & CLI</h2>
          <p className="text-graphite">Use the CLI from a terminal, or the same functions from the library:</p>
          <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed slab bg-tar text-volt">{`npx sep7-pay pay --to GBRP… --amount 10 --msg "Coffee" --qr          # QR in the terminal
npx sep7-pay pay --to GBRP… --amount 99 --asset USDC:GA5Z… --svg invoice.svg
npx sep7-pay pay --to GBRP… --testnet --callback https://shop.example/hook
npx sep7-pay parse "web+stellar:pay?destination=GBRP…&amount=3"
npx sep7-pay verify "<signed uri>" --key G…SIGNING_KEY`}</pre>
          <div className="slab overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-tar text-xs uppercase tracking-wider text-graphite">
                <tr>
                  <th className="p-3.5">Export</th>
                  <th className="p-3.5">Kind</th>
                  <th className="p-3.5">What it does</th>
                </tr>
              </thead>
              <tbody>
                {REFERENCE.map(([fn, who, what]) => (
                  <tr key={fn} className="border-t border-tar">
                    <td className="p-3.5 font-mono text-xs text-tar">{fn}</td>
                    <td className="p-3.5 text-graphite">{who}</td>
                    <td className="p-3.5 text-graphite">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-tar">FAQ</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="slab group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-tar">
                {q}
                <span className="transition group-open:rotate-45 text-signal">+</span>
              </summary>
              <p className="mt-3 text-sm text-graphite">{a}</p>
            </details>
          ))}
        </section>
      </article>
    </div>
  );
}

const START: string[] = [
  "Open the app and choose “Make a link”.",
  "Enter the destination G… address, the amount and the asset. Add a memo if the recipient needs one; exchanges usually do.",
  "Copy the link, download the QR code as SVG, or test it in your own wallet.",
  "Use “Inspect a link” to check any web+stellar URI someone sends you before you pay it."
];

const CONCEPTS: [string, string][] = [
  [
    "SEP-7",
    "The Stellar standard for web+stellar URIs that ask a wallet to make a payment (pay) or sign a transaction (tx)."
  ],
  [
    "Pay request",
    "Destination, amount, asset, memo and a message. The wallet builds and signs the payment."
  ],
  [
    "Tx request",
    "A ready-made transaction envelope (XDR) for the wallet to review and sign."
  ],
  [
    "Signed request",
    "Carries origin_domain and a signature that wallets check against SIGNING_KEY in that domain’s stellar.toml."
  ]
];

const REFERENCE: [string, string, string][] = [
  [
    "buildUri(request)",
    "function",
    "Validates a pay or tx request and returns the web+stellar URI"
  ],
  [
    "parseUri(uri)",
    "function",
    "Parses a URI back into a typed request; throws Sep7Error on bad input"
  ],
  [
    "validate(request)",
    "function",
    "Checks a request against the SEP-7 rules"
  ],
  [
    "signUri(request, domain, keypair)",
    "function",
    "Adds origin_domain and a signature"
  ],
  [
    "verifyUri(uri, signingKey)",
    "function",
    "Checks a signed request against the domain’s SIGNING_KEY"
  ],
  [
    "toQrSvg(uri) · toQrTerminal(uri)",
    "function",
    "Renders the link as a QR code"
  ]
];

const FAQ: [string, string][] = [
  [
    "Which wallets open these links?",
    "Wallets that support SEP-7 web+stellar links. The QR code encodes the same link."
  ],
  [
    "Does sep7-pay touch my funds?",
    "No. It only builds text links. Payments go directly from the payer’s wallet to your address."
  ],
  [
    "Can I request USDC?",
    "Yes. Pick Circle’s USDC or enter any asset code and issuer."
  ],
  [
    "Why sign a request?",
    "So the payer’s wallet can show it came from your domain, which protects against tampered links."
  ],
  [
    "Is there a server?",
    "No. Everything runs in the browser or in your own code."
  ],
  [
    "What if a field is invalid?",
    "The builder names the field and the rule that failed before any link is created."
  ]
];
