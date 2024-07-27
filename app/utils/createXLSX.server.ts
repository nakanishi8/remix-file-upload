import * as fs from "fs";
import * as path from "path";
import { promises as fsPromises } from "fs";
import XLSX from "xlsx";
import { tmpdir } from "node:os";

interface Thread {
  time: string;
  id: string;
  host: string;
  method: string;
  request: string;
  status: number | null;
}

interface Result {
  [key: string]: {
    id: string;
    start: string;
    end: string | null;
    host: string;
    method: string;
    request: string;
    status: number | null;
    delay?: number; // 遅延時間（秒）を追加
  };
}

const reInfoB: RegExp =
  /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[(.*?)\] INFO  c.j.d.api.common.logging.AccessLog - {"fn":"B","ts":"(.*?)","ip":".*?","ri":".*?","ht":"(.*?)","md":"(.*?)","cm":"(.+?)","tm":.*?,"cs":-1,"ca":-1}/;

const reInfoE: RegExp =
  /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[(.*?)\] INFO  c.j.d.api.common.logging.AccessLog - {"fn":"E","ts":"(.*?)","te":.*?,"ip":".*?","ri":".*?","ht":"(.*?)","md":"(.*?)","cm":"(.+?)","st":(.*?),"tm":.*?,"cs":-1,"ca":-1}/;

export const processJettyFiles = async (
  directory: string,
  uploadFilename: string
) => {
  try {
    const entries = await fsPromises.readdir(directory, {
      withFileTypes: true,
    });
    for (let entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "jetty" && !entryPath.includes("__MACOSX")) {
          // jettyディレクトリが見つかった場合、そのディレクトリ内のファイルに対して処理を実行
          await processFilesInJetty(entryPath, uploadFilename);
        } else {
          // jettyディレクトリ以外の場合、再帰的に探索を続ける
          await processJettyFiles(entryPath, uploadFilename);
        }
      }
    }
  } catch (err) {
    console.error("Error processing files:", err);
  }
};

export const processFilesInJetty = async (
  jettyDirectory: string,
  uploadFilename: string
) => {
  try {
    let extractedPart = "";
    XLSX.set_fs(fs);
    const workbook = XLSX.utils.book_new();
    const files = await fsPromises.readdir(jettyDirectory);
    for (let file of files) {
      const filePath = path.join(jettyDirectory, file);
      // ここでファイルに対する処理を実行
      const fileName = path.basename(file);
      console.log(`Processing file: ${filePath}`);
      const pattern = /-(\w+)\.[^.]+$/;
      const match = fileName.match(pattern);
      if (match) {
        extractedPart = match[1];
        console.log(extractedPart);
      } else {
        console.log("No match found");
      }

      const results: Result = {};
      const infoBThreads: Thread[] = [];
      const infoEThreads: Thread[] = [];

      const lines = fs
        .readFileSync(filePath, { encoding: "utf-8" })
        .replace(/""/g, '"')
        .split("\n");
      lines.forEach((line) => {
        const infoBMatch = reInfoB.exec(line);
        const infoEMatch = reInfoE.exec(line);
        if (infoBMatch) {
          const thread = {
            time: infoBMatch[1],
            id: infoBMatch[2],
            host: infoBMatch[4],
            method: infoBMatch[5],
            request: infoBMatch[6],
            status: null,
          };
          infoBThreads.push(thread);
        }
        if (infoEMatch) {
          const thread = {
            time: infoEMatch[1],
            id: infoEMatch[2],
            host: infoEMatch[4],
            method: infoEMatch[5],
            request: infoEMatch[6],
            status: parseInt(infoEMatch[7], 10),
          };
          infoEThreads.push(thread);
        }
      });

      infoBThreads.forEach((infoBThread) => {
        const { id, time, host, method, request } = infoBThread;
        const key = id + time + host + method + request;

        if (!results[key]) {
          results[key] = {
            id,
            start: time,
            end: null,
            host,
            method,
            request,
            status: null,
          };
        }

        const foundInfoEThread = infoEThreads.find(
          (infoEThread) =>
            id === infoEThread.id &&
            host === infoEThread.host &&
            method === infoEThread.method &&
            request === infoEThread.request &&
            time < infoEThread.time
        );

        if (foundInfoEThread) {
          results[key].status = foundInfoEThread.status;
          results[key].end = foundInfoEThread.time;
          const index = infoEThreads.indexOf(foundInfoEThread);
          infoEThreads.splice(index, 1);
        }
      });

      // Excelファイルの作成
      const worksheet = XLSX.utils.json_to_sheet(
        Object.values(results).map((entry) => {
          let delay = null;
          if (entry.start && entry.end) {
            const startDate = new Date(entry.start);
            const endDate = new Date(entry.end);
            delay = (endDate.getTime() - startDate.getTime()) / 1000;
          }
          return {
            スレッド: entry.id,
            ホスト: entry.host,
            開始日時: entry.start,
            終了日時: entry.end,
            遅延: delay,
            ステータス: entry.status,
            メソッド: entry.method,
            リクエスト: entry.request,
          };
        })
      );
      XLSX.utils.book_append_sheet(workbook, worksheet, extractedPart);
    }
    const directory = tmpdir();
    XLSX.writeFile(workbook, `${directory}/${uploadFilename}`);
  } catch (err) {
    console.error("Error processing jetty files:", err);
  }
};
