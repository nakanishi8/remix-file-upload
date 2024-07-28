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

import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";

import { FileIcon, InfoCircledIcon, UploadIcon } from "@radix-ui/react-icons";
import { json, unstable_parseMultipartFormData } from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useResolvedPath,
  useSubmit,
} from "@remix-run/react";
import { format } from "date-fns";
import { nanoid } from "nanoid";
import { Card } from "~/components/ui/card.tsx";
import { Progress } from "~/components/ui/progress.tsx";
import { uploadEventBus } from "~/utils/UploadEventBus.server.ts";
import { redirectWithConfetti } from "~/utils/confetti.server.ts";
import { createObservableFileUploadHandler } from "~/utils/createObservableFileUploadHandler.server.ts";
import { useUploadProgress } from "~/utils/useUploadProgress.ts";
import { processJettyFiles, processFile } from "~/utils/createXLSX.server.ts";
import { useUpload } from "../utils/UploadContext";

import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import * as ZIP_FILE from "is-zip-file";
import XLSX from "xlsx";

type UploadProgressEvent = Readonly<{
  uploadId: string;
  name: string;
  filename: string;
  filesizeInKilobytes: number;
  uploadedKilobytes: number;
  percentageStatus: number;
  remainingDurationInSeconds: number;
}>;

export const meta: MetaFunction = () => [
  {
    title: "Advanced Example",
  },
];

export function loader() {
  const uploadId = nanoid();

  return json({ uploadId });
}

export async function action({ request }: ActionFunctionArgs) {
  const start = Date.now();

  const maxPartSize = 100_000_000; // 100 MB

  const url = new URL(request.url);
  const uploadId = url.searchParams.get("uploadId");

  if (!uploadId) {
    throw new Response(null, {
      status: 400,
      statusText: "Upload ID is missing.",
    });
  }

  // Get the overall filesize of the uploadable file.
  const filesize = Number(request.headers.get("Content-Length"));

  if (filesize > maxPartSize) {
    throw new Response(null, {
      status: 400,
      statusText: "File size exceeded",
    });
  }

  const formattedDate = format(start, "yyyyMMdd_HHmmss");

  const filesizeInKilobytes = Math.floor(filesize / 1024);

  const observableFileUploadHandler = createObservableFileUploadHandler({
    formattedDate,
    avoidFileConflicts: true,
    maxPartSize,
    onProgress({ name, filename, uploadedBytes }) {
      const elapsedMilliseconds = Date.now() - start;

      const averageSpeed = uploadedBytes / elapsedMilliseconds;
      const remainingBytes = filesize - uploadedBytes;
      const remainingDurationInMilliseconds = remainingBytes / averageSpeed;

      uploadEventBus.emit<UploadProgressEvent>({
        uploadId,
        name,
        filename,
        filesizeInKilobytes,
        remainingDurationInSeconds: Math.floor(
          remainingDurationInMilliseconds / 1000
        ),
        uploadedKilobytes: Math.floor(uploadedBytes / 1024),
        percentageStatus: Math.floor((uploadedBytes * 100) / filesize),
      });
    },
    async onDone({ name, filename }) {
      uploadEventBus.emit<UploadProgressEvent>({
        uploadId,
        name,
        filename,
        filesizeInKilobytes,
        remainingDurationInSeconds: 0,
        uploadedKilobytes: filesizeInKilobytes,
        percentageStatus: 100,
      });
    },
    async onXLSX({ uploadFilename, filepath, destDir }) {
      if (ZIP_FILE.isZipSync(filepath)) {
        return new Promise<void>(async (resolve, reject) => {
          // ZIPファイルを読み込む
          fs.readFile(filepath, async (err: Error | null, data: Buffer) => {
            if (err) throw err;

            try {
              // JSZipでZIPファイルを読み込む
              const zip = await JSZip.loadAsync(data);

              fs.mkdirSync(destDir, { recursive: true });

              // ZIPファイルの内容を展開する
              const extractedFiles = await Promise.all(
                Object.keys(zip.files).map(async (zipFilepath) => {
                  const file = zip.files[zipFilepath];
                  if (file.dir) return;
                  // ファイルを解凍して保存
                  const content = await file.async("nodebuffer");
                  // 解凍先のファイルパスを生成
                  const outputPath = path.join(destDir, zipFilepath);
                  // outputPathからディレクトリパスを取得
                  const outputDir = path.dirname(outputPath);
                  // 必要に応じてディレクトリを作成
                  fs.mkdirSync(outputDir, { recursive: true });

                  return new Promise((resolve, reject) => {
                    fs.writeFile(outputPath, content, (err) => {
                      if (err) reject(err);
                      console.log(`${outputPath} was extracted.`);
                      resolve(outputPath);
                    });
                  });
                })
              );
              // processJettyFiles関数を実行
              await processJettyFiles(destDir, uploadFilename);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      } else {
        XLSX.set_fs(fs);
        const workbook = XLSX.utils.book_new();
        await processFile(filepath, workbook, uploadFilename);
      }
    },
  });

  await unstable_parseMultipartFormData(request, observableFileUploadHandler);
  console.log("Upload done.");

  return redirectWithConfetti("/upload/done");
}

export default function AdvancedExample() {
  const submit = useSubmit();
  const loaderData = useLoaderData<typeof loader>();
  const currentPath = useResolvedPath(".");
  const { setUploadFilename } = useUpload();

  const progress = useUploadProgress<UploadProgressEvent>(loaderData.uploadId);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h3 className="text-xl font-bold">Advanced Example</h3>
        <p className="text-muted-foreground">
          This example showcases an advanced implementation of an observable
          file upload. It includes everything that the{" "}
          <Link to="/upload/basic" className="text-pink-500 underline">
            basic example
          </Link>{" "}
          offers, and it also provides additional features such as displaying
          the uploaded bytes and estimating the remaining upload time.
        </p>
      </header>

      <Card className="p-4 shadow-xl">
        <Form
          className="flex flex-col gap-4"
          method="POST"
          encType="multipart/form-data"
          action={`${currentPath.pathname}?uploadId=${loaderData.uploadId}`}
          onChange={(event) => {
            submit(event.currentTarget);
            const target = event.target as HTMLInputElement;
            if (target.files && target.files[0]) {
              const uploadFilename = target.files[0].name.replace(
                /\.[^/.]+$/,
                ".xlsx"
              );
              setUploadFilename(uploadFilename);
            }
          }}
        >
          <label
            htmlFor="file"
            className="flex flex-col gap-2 items-center p-8 border-dashed rounded-lg border-slate-300 border-[1px]"
          >
            <UploadIcon className="w-8 h-8" />
            <p className="text-slate-500 text-sm">
              Select a file you want to upload.
            </p>
            <input id="file" name="file" type="file" className="hidden" />
          </label>

          <p className="text-center text-muted-foreground">
            <small>
              max. 100 MB (configurable via{" "}
              <Link
                to="https://github.com/akoenig/remix-observable-file-upload-demo/blob/d617b3a3f90fe8e87ef56081cf95512095332b6e/app/routes/upload.advanced.tsx#L85"
                className="text-pink-500 underline"
              >
                maxPartSize
              </Link>
              )
            </small>
          </p>

          {progress?.success && progress.event ? (
            <div className="flex flex-col bg-slate-50 rounded-lg p-4 gap-4 border-slate-100 border-[1px]">
              <div className="flex gap-3">
                <FileIcon className="h-8 w-8" />
                <div className="flex flex-col gap-1 flex-1">
                  <h4 className="font-bold text-xs">
                    {progress.event.filename}
                  </h4>
                  <div className="flex text-xs text-muted-foreground">
                    <p className="flex-1">
                      {progress.event.uploadedKilobytes} KB /{" "}
                      {progress.event.filesizeInKilobytes} KB ·{" "}
                      {progress.event.remainingDurationInSeconds} seconds left
                    </p>
                    <p>{progress.event.percentageStatus}%</p>
                  </div>
                </div>
              </div>
              <Progress value={progress.event.percentageStatus} />
            </div>
          ) : null}
        </Form>
      </Card>

      <p className="flex gap-2 text-xs text-muted-foreground items-center justify-center p-4">
        <InfoCircledIcon className="w-4 h-4" />
        Although the uploaded files are deleted after some time, please refrain
        from uploading any sensitive files here.
      </p>
    </section>
  );
}
