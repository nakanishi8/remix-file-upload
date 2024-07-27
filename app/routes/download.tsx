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

import { type LoaderFunctionArgs } from "@remix-run/node";
import { tmpdir } from "node:os";
import * as fs from "fs";
import * as path from "path";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  const requestedWith = headers.get("X-Requested-With");
  const uploadFilename = headers.get("X-Upload-Filename");

  if (requestedWith && uploadFilename) {
    const directory = tmpdir();
    const buffer = fs.readFileSync(`${directory}/${uploadFilename}`);
    cleanDirectory(directory, uploadFilename);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `"attachment; filename=${uploadFilename}"`,
      },
    });
  }
}

const cleanDirectory = async (directory: string, uploadFilename: string) => {
  fs.readdir(directory, (err, files) => {
    if (err) {
      return console.error("Unable to scan directory:", err);
    }

    // プレフィックスが 'upload_' のファイルとディレクトリをフィルタリング
    const uploadItems = files.filter(
      (file) => file.startsWith("upload_") || file === uploadFilename
    );

    uploadItems.forEach((item) => {
      const itemPath = path.join(directory, item);

      // ファイルかディレクトリかを確認
      fs.stat(itemPath, (err, stats) => {
        if (err) {
          return console.error("Unable to stat item:", err);
        }

        if (stats.isDirectory()) {
          // ディレクトリの場合、再帰的に削除
          fs.rmdir(itemPath, { recursive: true }, (err) => {
            if (err) {
              return console.error("Unable to remove directory:", err);
            }
            console.log(`Directory removed: ${itemPath}`);
          });
        } else {
          // ファイルの場合、削除
          fs.unlink(itemPath, (err) => {
            if (err) {
              return console.error("Unable to remove file:", err);
            }
            console.log(`File removed: ${itemPath}`);
          });
        }
      });
    });
  });
};
