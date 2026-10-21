# Android APK

綴庭の画面・画像・スクリプトを同梱したCapacitor Androidアプリ。通常の利用ではChromeを開かない。Android 6以降が対象で、最新のAndroid System WebViewを推奨する。Chromeアプリ本体のインストールは必須ではないが、AndroidのWebViewエンジンは使用する。

## インストールと初期状態

[最新のAPK](https://raid-arch.github.io/storymaker/downloads/tsuzuriniwa-1.0.1.apk) をダウンロードしてAndroidで開く。初回はダウンロード元からのインストール許可が必要になる場合がある。

アプリIDは `jp.raidarch.tsuzuriniwa`。作品・人物等は一切同梱せず、初回は空。Web版/PWAのブラウザ内データはAPKへ自動移行しない。今回のAPKでは移行せず空から使う。端末の自動バックアップから旧作品が復活しないようAndroidの自動バックアップを無効にしている。アプリの更新はデータを維持し、アンインストール・Android設定の「ストレージを消去」はデータを削除する。自分で作った作品はJSONで保管できる。

ファイル出力はAndroidの保存先選択画面を使う。JSON復元はファイル選択から行う。初回の起動からオフラインで編集でき、更新確認と任意のGitHub同期にだけ通信が必要。Web版をインストールするバナーとサービスワーカーはAPKでは使わない。Androidの戻る操作はダイアログを閉じる・詳細から戻る・ホームへ戻る・アプリを背面に移す順に処理する。

## 更新

起動・アプリ復帰時に綴庭の配布サイトの更新を確認する（自動確認は6時間ごと）。手動は「設定・バックアップ → アプリの更新を確認」。新しい版があれば「APKを更新」でダウンロードし、Androidの更新確認画面を開く。初回だけ「綴庭による不明なアプリのインストール」を許可してアプリへ戻り、再度「APKを更新」を押す。

更新APKのSHA-256、アプリID、増加したversionCode、現在の署名証明書との一致を検証する。Androidの最終確認は省略しない。配信元は当リポジトリのHTTPS Pagesサイトに固定する。これは確認不要のサイレント更新ではない。

## ビルドと署名

Node.js 22.12以上、Java 21、Android SDK Platform 35・Build Tools 35.0.0を使用する。

```bash
npm ci
# Android SDKはANDROID_HOMEまたはandroid/local.propertiesで指定
export ANDROID_KEYSTORE_PATH=/private/path/tsuzuriniwa-release.p12
export ANDROID_KEYSTORE_PASSWORD=... # 秘密の値。公開ファイル・チャットへ記載しない
export ANDROID_KEY_ALIAS=tsuzuriniwa
export ANDROID_KEY_PASSWORD=... # 省略時はstorePasswordを使用
npm run android:apk
```

この開発環境では署名素材をgit管理外の `.android-signing/` に置く。ビルドスクリプトはそこにある `signing.env` を読み込める。同じ署名鍵を必ず継続使用する。鍵を紛失すると既存インストールへ更新できなくなるため、秘密の場所へ控えを保管する。署名鍵・パスワードをAPKやGitHub Releaseへ添付しない。

`android-version.json` のversionNameとversionCodeを更新する。versionCodeは毎回増やす。`release-artifacts/` にバージョン付きAPK、固定名APK、`android-release.json`、`SHA256SUMS` を生成する。バージョン付きAPKを `public/downloads/`、更新情報を `public/android-release.json` にコピーしてmainへpushするとPagesから配布できる。APK内へ配布APKを再帰的に同梱しないよう、Androidビルドでは `scripts/prepare-android.mjs` で配布ファイルを除外する。公開Releaseのタグは `android-v1.0.0` の形式。

```bash
mkdir -p public/downloads
cp release-artifacts/tsuzuriniwa-1.0.0.apk public/downloads/
cp release-artifacts/android-release.json public/
# 検証後、この配布ファイルと更新情報をmainへcommit/pushする
```

`.github/workflows/android.yml` は手動でビルドでき、署名設定後にActions variable `ANDROID_CI_ENABLED=true` を設定すると `android-v*` タグでもビルド・Release公開する。初回にリポジトリのActions secretsへ `ANDROID_KEYSTORE_BASE64`（同じPKCS12のBase64）と `ANDROID_KEYSTORE_PASSWORD` を登録する必要がある。開発環境のGitHub連携にはActions secretsへのアクセス権がないため、ここでは登録していない。初回APKは開発環境で正規の秘密鍵により署名して公開する。Web版のPagesビルドは従来のワークフローで継続する。

## 検証

型チェックと既存の保存・バックアップ・オフラインのブラウザテストに加え、Gradleのrelease assemble、Android Lint、`apksigner verify` を行う。APKの同梱ファイルに作品データ・サービスワーカー・署名秘密鍵がないことを確認する。署名済みAPKのSHA-256はReleaseの `SHA256SUMS` と比較できる。

今回の環境での確認結果：TypeScript型チェック、単体テスト63件、PC・Pixel 7相当のブラウザテスト83件、release assemble・Android Lint・APK署名と公開ファイルのSHA-256検証が完了。API 35ソフトウェアエミュレーターへの署名付きAPKの新規インストール・更新インストールも成功した。ただし、KVMを使えないこのエミュレーターではSystem UIのANRとWebViewレンダラーのSIGTRAPが発生し、アプリ画面の確認は完了できていない。実機での起動・ファイル出力・APK更新画面は未確認であり、ビルド成功と区別する。
