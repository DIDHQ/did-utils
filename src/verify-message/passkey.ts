/**
 * @see https://github.com/dotbitHQ/das-multi-device/blob/main/API.md
 */
export async function verifyPasskeyMessage(
  address: string,
  message: string,
  signature: `0x${string}`
) {
  const endpoint = address.startsWith("ckb1")
    ? "https://webauthn-api.did.id"
    : "https://test-webauthn-api.did.id";
  const info = await rpcCall<{ ckb_address: string[] }>(
    `${endpoint}/v1/webauthn/authorize-info`,
    { ckb_address: address }
  );
  return (
    await Promise.all(
      (info.ckb_address.length ? info.ckb_address : [address]).map(
        async (backup_addr) => {
          const { is_valid } = await rpcCall<{ is_valid: boolean }>(
            `${endpoint}/v1/webauthn/verify`,
            {
              master_addr: address,
              backup_addr,
              msg: message,
              signature: signature.replace(/^0x/, ""),
            }
          );
          return is_valid;
        }
      )
    )
  ).some((is_valid) => is_valid);
}

async function rpcCall<T>(url: string, json: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
  });
  if (response.ok) {
    const json = (await response.json()) as {
      err_no: number;
      err_msg: string;
      data: T;
    };
    if (json.err_no !== 0) {
      throw new Error(json.err_msg);
    }
    return json.data;
  }
  throw new Error(response.statusText);
}
