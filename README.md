# AIマッチング診断アプリ 公開手順

このフォルダには3つのファイルがあります。
- `index.html` … 画面（フロントエンド）
- `api/diagnose.js` … サーバー側の処理（Anthropic APIキーはここだけが知っている）
- `package.json` … Vercelがプロジェクトとして認識するための設定ファイル

以下の手順で、誰でもアクセスできる公開URLを作成できます。作業はすべて無料の範囲でできます（コーディング不要、コマンド入力も不要です）。

---

## STEP1：Anthropic APIキーを取得する

1. https://console.anthropic.com にアクセスし、アカウントを作成（またはログイン）
2. 左メニューの「API Keys」から「Create Key」を選び、新しいキーを発行する
3. 表示されたキー（`sk-ant-...`）をメモしておく（この画面を閉じると二度と表示されないので注意）

※ これはclaude.aiの契約とは別の「使った分だけ課金」の仕組みです。診断1回あたりのコストはごくわずかですが、無制限に公開する場合は下記STEP4の利用回数制限を必ず確認してください。

## STEP2：GitHubにこのフォルダをアップロードする

1. https://github.com でアカウントを作成（無料）
2. 右上の「+」→「New repository」で新しいリポジトリを作成（名前は何でもよい、例：`ai-matching-diagnosis`）
3. 作成後の画面で「uploading an existing file」（または「Add file」→「Upload files」）を選ぶ
4. このフォルダの中身（`index.html`、`api`フォルダごと、`package.json`）をドラッグ＆ドロップでアップロードし、「Commit changes」を押す

## STEP3：Vercelでデプロイする

1. https://vercel.com にアクセスし、「Continue with GitHub」でGitHubアカウントを使ってサインアップ
2. ダッシュボードで「Add New...」→「Project」を選択
3. STEP2で作ったリポジトリを選んで「Import」
4. 設定画面はそのままでよいが、「Environment Variables」の欄に以下を追加：
   - Name: `ANTHROPIC_API_KEY`
   - Value: STEP1でメモしたキー
5. 「Deploy」を押す（1〜2分で完了）
6. 完了すると `https://（プロジェクト名）.vercel.app` という公開URLが発行される

これで、このURLをスマホでもPCでも誰でも開けば、そのままAIマッチング診断が使えるようになります。

## 採用版（オプション機能）について

基本診断（顧客軸）の結果が表示されると、続けて「採用軸」の診断を無料で試せるボタンが出ます。追加されたファイルは以下の2つです。

- `api/diagnose-recruit.js` … 採用軸（就活者目線）の診断を行うAPI。`api/diagnose.js`と同じ土台で、システムプロンプトと出力項目だけが異なります。
- `api/lead.js` … 採用版レポートの「改善提案」を開く直前に、メールアドレスを受け取るための簡易API。現状はサーバーのログに出力するだけの最小実装です。

### リード（メールアドレス）を実際に活用したい場合

`api/lead.js`は今のままだとログに残るだけで、どこにも通知されません。実際に営業フォローに使うには、Vercelの環境変数に以下を追加してください。

- Name: `LEAD_WEBHOOK_URL`
- Value: 送信先のWebhook URL（例：Google Apps ScriptでスプレッドシートにPOSTを受け取る、Zapier、Formspree等）

設定すると、メールアドレスが送信されるたびにこのURLへ自動転送されます。設定しない場合はログに残るのみです。

## STEP4（推奨）：公開前に確認しておきたいこと

- `api/diagnose.js` には1時間あたり20回までという簡易的な利用回数制限を入れてありますが、これはサーバーが再起動すると内容がリセットされる簡易版です。本格的に不特定多数へ公開する場合は、より確実な制限（Vercelの有料プランのレート制限機能や、Upstash等の外部サービス）の導入を検討してください。
- サイトの内容を変更したい場合（文言・デザイン等）は、GitHub上で該当ファイルを編集して「Commit changes」を押せば、Vercelが自動的に再デプロイします。
