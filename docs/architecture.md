# Architecture

```text
src/sep7.ts   validate · buildUri · parseUri · signUri · verifyUri
src/qr.ts     toQrSvg · toQrTerminal
src/cli.ts    run(argv, out): pay | parse | verify   (pure, testable)
src/bin.ts    process wiring only
```

## Validation first

Both `buildUri` and `parseUri` run the same `validate()`. A URI that parses
is always a URI that `buildUri` would produce, so wallets never receive
something this library considers invalid.

## Encoding

Values are encoded with `encodeURIComponent` (spaces become `%20`, as the
SEP-7 examples show). The parser also accepts `+` as a space, because form
encoders produce it.

## Request signing

```text
payload   = 35 × 0x00 ‖ 0x04 ‖ "stellar.sep.7 - URI Scheme" ‖ uri_without_signature
signature = base64( ed25519_sign(URI_REQUEST_SIGNING_KEY, payload) )
```

The signature is always the final query parameter, so verification strips
it textually and re-hashes exactly the bytes that were signed.
