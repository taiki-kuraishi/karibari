// 署名付き OAuth クエリが運ぶのは `ba_param` に載ったキー（と `sig` 自身）のみ。
// 後から URL に足したキーは署名対象外。サーバが検証する文字列と一致するよう
// 作り直して prelogin に送る。表示値はこの文字列から読み直すため、署名済みの値しか出ない。
export function buildSignedOAuthQuery(search: string): string | undefined {
  const params = new URLSearchParams(search);
  if (params.get("sig") === null) {
    return undefined;
  }
  const signedNames = params.getAll("ba_param");
  if (signedNames.length === 0) {
    return undefined;
  }
  const signed = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key === "sig" || key === "ba_param" || signedNames.includes(key)) {
      signed.append(key, value);
    }
  }

  return signed.toString();
}
