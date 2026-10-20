// 要求 scope の横に出す説明文。署名済みの値しかここに届かないため、
// 未知の scope は名前だけ出す。
export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  email: "登録済みのメールアドレスを読み取ります。",
  offline_access: "あなたがログインしていない間もアクセスを継続します。",
  openid: "アカウントの識別子を読み取ります。",
  profile: "公開プロフィール情報を読み取ります。",
};

export const REQUEST_FAILED =
  "リクエストを処理できませんでした。アプリケーションからやり直してください。";
