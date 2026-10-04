# Recipes

## Invoice PDF with a QR code

```ts
const uri = buildUri({ operation: "pay", destination, amount: "250", assetCode: "USDC",
                       assetIssuer: USDC_ISSUER, memo: invoice.number, msg: `Invoice ${invoice.number}` });
const svg = await toQrSvg(uri);   // embed in your PDF template
```

## "Pay with Stellar" button

```html
<a href="web+stellar:pay?destination=G…&amount=10">Pay 10 XLM</a>
```

Wallets that registered the `web+stellar` handler open it directly.

## Donation link where the payer picks the amount

Omit `amount`; wallets will ask the payer.

## Verifying an incoming signed request in a wallet

Fetch `https://<origin_domain>/.well-known/stellar.toml`, read
`URI_REQUEST_SIGNING_KEY`, and call `verifyUri(uri, key)`. Show the
origin domain only if it verifies.
