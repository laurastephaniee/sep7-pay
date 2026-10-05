# sep7-pay

**Stellar payment links and QR codes that wallets understand.**

`sep7-pay` builds, parses, validates and signs
[SEP-7](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md)
payment requests: the `web+stellar:pay?...` links that Stellar wallets
(Freighter, LOBSTR, Vibrant and others) open as a pre-filled payment. Put
one on an invoice, a checkout page, a donation button or a printed QR
code at a market stall.

```ts
import { buildUri, toQrSvg } from "sep7-pay";

const uri = buildUri({
  operation: "pay",
  destination: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
  amount: "25",
  assetCode: "USDC",
  assetIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  memo: "invoice-42",
  msg: "Invoice #42 from Acme Design",
});
// web+stellar:pay?destination=GBRP…&amount=25&asset_code=USDC&asset_issuer=GA5Z…&memo=invoice-42&msg=Invoice%20%2342%20from%20Acme%20Design

const svg = await toQrSvg(uri); // drop straight into an <img> or a PDF
```

## Why use it

Hand-rolling these URIs is easy to get subtly wrong, and wallets reject
or mis-handle broken ones. `sep7-pay` checks everything before a link
reaches a customer:

- G… and M… (muxed) destinations, validated with real checksums
- amounts: positive, at most 7 decimal places (Stellar's precision)
- issued assets need both `asset_code` (1–12 alphanumerics) and `asset_issuer`
- memos: `MEMO_TEXT` ≤ 28 **bytes** (multi-byte characters counted
  correctly), `MEMO_ID` within u64, `MEMO_HASH`/`MEMO_RETURN` exactly 32
  bytes of base64
- `msg` ≤ 300 characters, `callback` in SEP-7's `url:` form, a real
  domain for `origin_domain`
- `tx` requests carry a parseable transaction envelope
- values are percent-encoded per the spec (spaces as `%20`), and URIs
  from form encoders that use `+` still parse
- duplicate parameters are rejected

Every failure throws a `Sep7Error` with a readable message and a `field`
property, so you can highlight the right input in a form.

## Signed requests

Businesses can sign their links so wallets show a verified origin, which
protects customers from look-alike payment requests. Publish
`URI_REQUEST_SIGNING_KEY` in your domain's `stellar.toml`, then:

```ts
import { Keypair } from "@stellar/stellar-sdk";
import { signUri, verifyUri } from "sep7-pay";

const signed = signUri(request, "shop.example", Keypair.fromSecret(SIGNING_SECRET));
verifyUri(signed, "G…YOUR_URI_REQUEST_SIGNING_KEY"); // true; any edit makes it false
```

The signature covers SEP-7's exact payload: 35 zero bytes, `0x04`, the
label `stellar.sep.7 - URI Scheme`, then the URI without its signature.

## CLI

```bash
# not published to npm yet: install from source
git clone https://github.com/laurastephaniee/sep7-pay && cd sep7-pay
npm install && npm run build && npm link   # puts `sep7-pay` on your PATH

sep7-pay pay --to GBRP… --amount 10 --msg "Coffee" --qr          # QR in the terminal
sep7-pay pay --to GBRP… --amount 99 --asset USDC:GA5Z… --svg invoice.svg
sep7-pay pay --to GBRP… --testnet --callback https://shop.example/hook
sep7-pay parse "web+stellar:pay?destination=GBRP…&amount=3"
sep7-pay verify "<signed uri>" --key G…SIGNING_KEY [--json]
```

## API

| Export | Description |
| --- | --- |
| `buildUri(request)` | Validate and serialise a `PayRequest` or `TxRequest` |
| `parseUri(uri)` | Parse and validate a `web+stellar:` URI |
| `validate(request)` | Throw on the first problem, without building |
| `signUri(request, originDomain, keypair)` | Return a signed URI |
| `verifyUri(uri, signingKey)` | Check a signed URI |
| `memoRequired(horizonAccount)` | SEP-29: whether an account (e.g. an exchange deposit address) needs a memo |
| `toQrSvg(uri)` / `toQrTerminal(uri)` | Render a QR code |
| `Sep7Error` | Error type with a `field` property |

## Development

```bash
npm install
npm test          # 32 tests (library + CLI)
npm run lint && npm run typecheck && npm run build
```

## Web app

![sep7-pay web app](docs/assets/web-app.png)

The site has three pages: **Home** (what it does, with live testnet data), **App** (the tool itself) and **Docs** (getting started, concepts, reference and FAQ).

![sep7-pay app page](docs/assets/web-app-page.png)

A payment-link studio at `web/`, built on this library:

- **Make a link**: destination, amount (or let the payer choose), XLM / USDC / any asset, memo with type, a message and testnet toggle. Every field is validated live, with the error shown on the field that caused it.
- A live **QR code**, the exact URI, **copy**, **download SVG** and **open in wallet**.
- **Inspect a link**: paste any `web+stellar:` URI to see whether it's valid and what it asks for, and verify a signed request against the origin's signing key.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

The app imports the library straight from `../src`, so the browser and the CLI
share one implementation. `netlify.toml` at the repo root deploys it as-is.

## Documentation

- [Architecture](docs/architecture.md)
- [Recipes](docs/recipes.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Changelog](CHANGELOG.md)

## Glossary (new to Stellar?)

- **SEP-7**: a Stellar Ecosystem Proposal defining `web+stellar:` links so
  any wallet can open a payment (`pay`) or a transaction to sign (`tx`).
- **Muxed account (M…)**: one Stellar account with many virtual
  sub-accounts, often used by exchanges to tell customers apart.
- **Asset code / issuer**: issued assets such as USDC are identified by a
  short code plus the account that issued them. Native XLM needs neither.
- **Memo**: a short tag attached to a payment, e.g. an invoice number.
  Exchanges often require one to credit the right customer.
- **Stroop**: 0.0000001 XLM, which is why amounts allow at most 7 decimals.
- **stellar.toml**: a file at `https://<domain>/.well-known/stellar.toml`
  where a business publishes keys and details about itself.

## License

MIT
