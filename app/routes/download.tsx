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

import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { tmpdir } from "node:os";
import * as fs from "fs";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  const requestedWith = headers.get("X-Requested-With");

  if (requestedWith && url.searchParams.has("formattedDate")) {
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
