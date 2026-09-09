# 全体設計 spec（overall-arch）

## 目的
- LLMがMCP経由でHTMLを入稿 → URL共有 → 要素ごとにコメント → 修正を回す、自前運用できるOSS（karibari / 仮貼り）を作る
- Claude Design相当の「作る→見せる→直す」を自分の手元で回せるようにする
- 被らない核は「自前運用できるOSS」であること

## スコープ外（初版でやらない）
- リアルタイム同時編集
- UI内蔵LLMチャット・課金

## 要件（合意済み）
- MCP経由で htmlの入稿 / 編集 / コメント に対応する
- Viewer側はURL共有、要素単位コメント、HTML編集ができること
- URLの公開範囲を設定できることが必須（自分だけ / 招待 / 署名付きURLでURLを知っている人だけ、の方針）
- Cloudflare host前提（Workers + R2 + D1想定）
- 方向性はシンプル自前版: UI配信とMCP、R2にHTML不変バージョン、D1にmeta管理

## 設計
### Worker分割方針
- 方針: 責務分離を優先する
- 構成: 3デプロイ単位（packageは分離、StaticはApiに同居）
  - packages/viewer: SPA（bun＋Vite、build→dist）。単体ではデプロイしない
  - packages/api + Static同居: Api Workerにstatic-assetsとしてviewer/distを載せる。`run_worker_first`は`/api/*`と`/internal/*`のみ、`not_found_handling`は`single-page-application`。Viewer用API + R2取得 + MCP用内部API。meta用D1とR2の書込み口。表示可否の判断はせずAuthの返事に従う
  - MCP Worker（packages/mcp）: html入稿 / 編集 / コメントのMCP受け口
  - Auth Worker（packages/auth）: better-auth（user/session管理）＋公開範囲3種の判定集約（`/internal/verify-access`）。認証・セッション・招待・署名検証の単一判定点
- MCP WorkerとApiは判定を持たず、Authの検証結果のみを使う方向
- 同一ドメイン方針: Api同居のためworkers.devでも単一ドメイン（`/*`→Static、`/api/*`→Api、`/internal/*`は外部公開しない）になる。本番カスタムドメインでも構成変更なし。将来的にUI/APIのデプロイ頻度が乖離したらStaticを別Workerに切り出す

### D1分担
- D1を2つに分ける（meta用 / auth用）
  - meta用D1: projects、versions、comments、shares（公開範囲・招待・署名）などのmeta管理
  - auth用D1: better-auth系テーブル（ユーザー・セッション・招待）の管理
- 境界とバックアップ単位を明確にする目的。単一D1同居より運用は少し重くなる点は許容する
- 例外としてAuthは判定のためmeta用D1のsharesも読む（metaを読む場所はApiとAuthの2箇所になる）。書込みはApiに寄せたままにする

### R2分担
- 単一バケット + prefix（例: projects/{id}/versions/{v}/）でHTML不変バージョンを保存する
- R2は直接公開せず、Api Worker経由でのみ取得する
- latestエイリアス等は持たず、参照すべきバージョンはmeta用D1が持つ方向

### 書込み経路
- 書込み口はApi側の内部API（`/internal/*`、外部公開しない）に集約する
- MCP WorkerはR2/D1に直接書かず、内部API経由でのみ書く（R2/D1への書込み口を1つにする）
- 境界を堅くする目的。初版から一手間増える点は許容する

### 公開範囲検証（Auth集約）
- 方針: 自分だけ / 招待 / 署名付きURLの3種ともAuthが可否判定する。Apiは判定せず結果に従う
- 自分だけ: Api→Authにセッション照会→Authはauth用D1＋meta用D1の所有者確認→OKならApiがR2取得
- 招待: Api→Authに招待トークン転送→Authはmeta用D1のshares確認（セッションがあれば併せて確認）→OKならApiがR2取得
- 署名付きURL: Api→Authに`exp`/`sig`転送→AuthがHMAC再計算＋期限確認→OKならApiがR2取得。毎回Auth往復になる点とAuth停止時は全表示停止になる点は許容する
- better-auth設定方針: DBはauth用D1、Cookieは`httpOnly・Secure・SameSite=Lax`、サインアップは開放せず招待制・管理者作成のみ。署名用HMAC鍵本体はSecrets管理とし、shares側には鍵IDのみ持つ

## エラー処理
- 方針: 存在の有無を推測させないため、ない・権限なし・失効はすべて404に寄せる（fail closed、詳細は出さない）
  - 対象: 存在しないproject/version、権限なし、自分だけ・招待・署名の失効・不一致（期限切れ・署名不一致・招待無効）
  - R2欠損（metaはあるが実体なし）・Auth判定不可（停止・タイムアウト）も404に寄せ、内訳はログのみに残す
- ログ: 内訳（not_found / forbidden / expired / invalid_sig / r2_missing / auth_unavailable）はサーバ側ログに残し、レスポンスボディは一律404の汎用文にする

## テスト方針
- 方針: 初版から自動を厚めにする（E2E・境界値まで自動化。速度より安心を取る）
  - 公開範囲3種（自分だけ / 招待 / 署名付きURL）の可否マトリクス
  - ない・権限なし・失効・R2欠損・Auth判定不可の一律404化
  - 入稿→新version追加→表示、要素単位コメントの保存・取得、HTML編集の新version化
  - 署名の境界値（期限切れ・1秒前後・改ざん・別version流用）、招待の失効・再発行
  - 手動確認はViewerの見た目・操作感のみに寄せる
