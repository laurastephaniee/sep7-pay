import { Keypair, Networks, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";

/** URI scheme registered by SEP-7. */
export const SCHEME = "web+stellar:";
/** Longest `msg` SEP-7 allows. */
export const MAX_MSG_LENGTH = 300;
/** Longest MEMO_TEXT the Stellar protocol allows, in bytes. */
export const MAX_MEMO_TEXT_BYTES = 28;

export type MemoType = "MEMO_TEXT" | "MEMO_ID" | "MEMO_HASH" | "MEMO_RETURN";

export interface PayRequest {
  operation: "pay";
  /** Account (G…) or muxed account (M…) to pay. */
  destination: string;
  /** Decimal amount, up to 7 decimal places. Omit to let the payer choose. */
  amount?: string;
  /** Omit both for native XLM. */
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  memoType?: MemoType;
  /** Where the signed transaction should be POSTed instead of submitted. */
  callback?: string;
  /** Human-readable note shown to the payer (max 300 chars). */
  msg?: string;
  networkPassphrase?: string;
  originDomain?: string;
  signature?: string;
}

export interface TxRequest {
  operation: "tx";
  /** Base64 transaction envelope for the wallet to sign. */
  xdr: string;
  callback?: string;
  pubkey?: string;
  msg?: string;
  networkPassphrase?: string;
  originDomain?: string;
  signature?: string;
}

export type Sep7Request = PayRequest | TxRequest;

export class Sep7Error extends Error {
  constructor(
    message: string,
    /** The request field the problem is about, when there is one. */
    public readonly field?: string,
  ) {
    super(message);
    this.name = "Sep7Error";
  }
}

// camelCase field → SEP-7 query parameter, in the order they're emitted.
const PAY_PARAMS: [keyof PayRequest, string][] = [
  ["destination", "destination"],
  ["amount", "amount"],
  ["assetCode", "asset_code"],
  ["assetIssuer", "asset_issuer"],
  ["memo", "memo"],
  ["memoType", "memo_type"],
  ["callback", "callback"],
  ["msg", "msg"],
  ["networkPassphrase", "network_passphrase"],
  ["originDomain", "origin_domain"],
  ["signature", "signature"],
];

const TX_PARAMS: [keyof TxRequest, string][] = [
  ["xdr", "xdr"],
  ["callback", "callback"],
  ["pubkey", "pubkey"],
  ["msg", "msg"],
  ["networkPassphrase", "network_passphrase"],
  ["originDomain", "origin_domain"],
  ["signature", "signature"],
];

const AMOUNT = /^(?=\.?\d)\d*(\.\d{1,7})?$/;
const ASSET_CODE = /^[A-Za-z0-9]{1,12}$/;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/** Throws a Sep7Error describing the first problem found, if any. */
export function validate(request: Sep7Request): void {
  if (request.operation === "pay") validatePay(request);
  else validateTx(request);

  if (request.msg !== undefined && request.msg.length > MAX_MSG_LENGTH) {
    throw new Sep7Error(`msg must be at most ${MAX_MSG_LENGTH} characters`, "msg");
  }
  if (request.callback !== undefined && !/^url:https?:\/\//.test(request.callback)) {
    throw new Sep7Error('callback must look like "url:https://…"', "callback");
  }
  if (request.originDomain !== undefined && !DOMAIN.test(request.originDomain)) {
    throw new Sep7Error("origin_domain must be a fully qualified domain name", "originDomain");
  }
}

function validatePay(r: PayRequest): void {
  if (
    !StrKey.isValidEd25519PublicKey(r.destination) &&
    !StrKey.isValidMed25519PublicKey(r.destination)
  ) {
    throw new Sep7Error("destination must be a G… or M… Stellar address", "destination");
  }
  if (r.amount !== undefined) {
    if (!AMOUNT.test(r.amount) || Number(r.amount) <= 0) {
      throw new Sep7Error("amount must be positive with at most 7 decimal places", "amount");
    }
  }
  if (r.assetCode !== undefined || r.assetIssuer !== undefined) {
    if (!r.assetCode || !ASSET_CODE.test(r.assetCode)) {
      throw new Sep7Error("asset_code must be 1-12 letters or digits", "assetCode");
    }
    if (!r.assetIssuer || !StrKey.isValidEd25519PublicKey(r.assetIssuer)) {
      throw new Sep7Error("asset_issuer must be a G… address when asset_code is set", "assetIssuer");
    }
  }
  if (r.memo !== undefined) validateMemo(r.memo, r.memoType ?? "MEMO_TEXT");
  else if (r.memoType !== undefined) {
    throw new Sep7Error("memo_type was given without a memo", "memoType");
  }
}

function validateMemo(memo: string, type: MemoType): void {
  switch (type) {
    case "MEMO_TEXT":
      if (new TextEncoder().encode(memo).length > MAX_MEMO_TEXT_BYTES) {
        throw new Sep7Error(`MEMO_TEXT must be at most ${MAX_MEMO_TEXT_BYTES} bytes`, "memo");
      }
      return;
    case "MEMO_ID":
      if (!/^\d+$/.test(memo) || BigInt(memo) > 18446744073709551615n) {
        throw new Sep7Error("MEMO_ID must be an unsigned 64-bit integer", "memo");
      }
      return;
    case "MEMO_HASH":
    case "MEMO_RETURN": {
      const bytes = Buffer.from(memo, "base64");
      if (bytes.length !== 32 || bytes.toString("base64") !== memo) {
        throw new Sep7Error(`${type} must be 32 bytes, base64-encoded`, "memo");
      }
      return;
    }
    default:
      throw new Sep7Error(`unknown memo_type ${String(type)}`, "memoType");
  }
}

function validateTx(r: TxRequest): void {
  try {
    TransactionBuilder.fromXDR(r.xdr, r.networkPassphrase ?? Networks.PUBLIC);
  } catch {
    throw new Sep7Error("xdr is not a valid base64 transaction envelope", "xdr");
  }
  if (r.pubkey !== undefined && !StrKey.isValidEd25519PublicKey(r.pubkey)) {
    throw new Sep7Error("pubkey must be a G… address", "pubkey");
  }
}

/** Validates and serialises a request into a `web+stellar:` URI. */
export function buildUri(request: Sep7Request): string {
  validate(request);
  const params = request.operation === "pay" ? PAY_PARAMS : TX_PARAMS;
  const query = params
    .filter(([key]) => (request as unknown as Record<string, unknown>)[key] !== undefined)
    .map(([key, name]) => {
      const value = String((request as unknown as Record<string, unknown>)[key]);
      return `${name}=${encodeURIComponent(value)}`;
    })
    .join("&");
  return `${SCHEME}${request.operation}?${query}`;
}

/** Parses and validates a `web+stellar:` URI. Throws Sep7Error on anything malformed. */
export function parseUri(uri: string): Sep7Request {
  if (!uri.startsWith(SCHEME)) {
    throw new Sep7Error(`URI must start with ${SCHEME}`);
  }
  const rest = uri.slice(SCHEME.length);
  const q = rest.indexOf("?");
  const operation = q === -1 ? rest : rest.slice(0, q);
  const query = q === -1 ? "" : rest.slice(q + 1);

  const values = new Map<string, string>();
  for (const part of query.split("&").filter(Boolean)) {
    const eq = part.indexOf("=");
    const name = eq === -1 ? part : part.slice(0, eq);
    const raw = eq === -1 ? "" : part.slice(eq + 1);
    if (values.has(name)) throw new Sep7Error(`duplicate parameter ${name}`);
    values.set(name, decodeURIComponent(raw.replace(/\+/g, "%20")));
  }

  let request: Sep7Request;
  if (operation === "pay") {
    if (!values.has("destination")) throw new Sep7Error("pay requires destination", "destination");
    request = fromParams({ operation: "pay" }, PAY_PARAMS, values) as PayRequest;
  } else if (operation === "tx") {
    if (!values.has("xdr")) throw new Sep7Error("tx requires xdr", "xdr");
    request = fromParams({ operation: "tx" }, TX_PARAMS, values) as TxRequest;
  } else {
    throw new Sep7Error(`unsupported operation "${operation}" (expected pay or tx)`);
  }
  validate(request);
  return request;
}

function fromParams<T extends Sep7Request>(
  base: Pick<T, "operation">,
  params: [keyof T, string][],
  values: Map<string, string>,
): T {
  const out: Record<string, unknown> = { ...base };
  for (const [key, name] of params) {
    if (values.has(name)) out[key as string] = values.get(name);
  }
  return out as T;
}

// SEP-7 request signing: 35 zero bytes + 0x04, then the fixed label, then
// the URI without its signature parameter.
const SIGNING_PREFIX = Buffer.concat([Buffer.alloc(35), Buffer.from([4])]);
const SIGNING_LABEL = "stellar.sep.7 - URI Scheme";

function signingPayload(uriWithoutSignature: string): Buffer {
  return Buffer.concat([SIGNING_PREFIX, Buffer.from(SIGNING_LABEL + uriWithoutSignature)]);
}

function stripSignature(uri: string): string {
  return uri.replace(/&signature=[^&]*$/, "");
}

/**
 * Signs a request on behalf of `originDomain`, whose stellar.toml must
 * publish the signing key as URI_REQUEST_SIGNING_KEY. Returns the signed URI.
 */
export function signUri(request: Sep7Request, originDomain: string, signer: Keypair): string {
  const unsigned = buildUri({ ...request, originDomain, signature: undefined });
  const signature = signer.sign(signingPayload(unsigned)).toString("base64");
  return `${unsigned}&signature=${encodeURIComponent(signature)}`;
}

/** Checks a signed URI's signature against the origin's published signing key. */
export function verifyUri(uri: string, signingKey: string): boolean {
  const request = parseUri(uri);
  if (!request.signature || !request.originDomain) return false;
  try {
    return Keypair.fromPublicKey(signingKey).verify(
      signingPayload(stripSignature(uri)),
      Buffer.from(request.signature, "base64"),
    );
  } catch {
    return false;
  }
}
