/**
 * @akoenig/remix-observable-file-upload-demo
 *
 * Copyright, 2023 - André König, Hamburg, Germany
 *
 * All rights reserved
 */

/**
 * @author André König <hi@andrekoenig.de>
 *
 */

import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useSearchParams } from "@remix-run/react";
import { tmpdir } from "node:os";
import { useEffect } from "react";
import * as fs from "fs";

export const meta: MetaFunction = () => [
  {
    title: "🎉Successful upload!",
  },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  if (!url.searchParams.has("formattedDate")) {
    const formattedDate = url.searchParams.get("formattedDate");
    const directory = tmpdir();
    const buffer = await fs.readFileSync(
      `${directory}/upload_${formattedDate}/${formattedDate}.xlsx`
    );
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `"attachment; filename=${formattedDate}.xlsx"`,
      },
    });
  }

  return json({});
}

export default function UploadDone() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    var xhr = new XMLHttpRequest();

    // レスポンスタイプをblobとして設定
    xhr.responseType = "blob";

    // リクエストが完了したときの処理
    xhr.onload = function () {
      // ステータスが200（成功）の場合
      if (xhr.status === 200) {
        // レスポンスからBlobオブジェクトを取得
        var blob = xhr.response;
        // BlobオブジェクトからURLを生成
        var url = window.URL.createObjectURL(blob);
        // a要素を作成してダウンロードリンクを設定
        var a = document.createElement("a");
        a.href = url;
        a.download = "downloaded_file.xlsx"; // ダウンロードするファイルの名前
        document.body.appendChild(a);
        a.click();
        // ダウンロード後は不要になったa要素とURLを削除
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // エラー処理
        console.error("Failed to download file.");
      }
    };

    // リクエストを開く
    if (searchParams.get("formattedDate")) {
      xhr.open(
        "GET",
        "/upload/done?formattedDate=" + searchParams.get("formattedDate")
      );
      // リクエストを送信
      xhr.send();
    }
  }, []);

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      <h1 className="text-6xl font-extrabold">🎉</h1>
      <h2 className="text-4xl font-extrabold">Hooray!</h2>
      <p className="text-2xl text-muted-foreground text-center">
        Your file upload was successful.
      </p>
    </div>
  );
}
