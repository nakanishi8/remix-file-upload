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

import { type MetaFunction } from "@remix-run/node";
import { useSearchParams } from "@remix-run/react";
import { useEffect } from "react";

export const meta: MetaFunction = () => [
  {
    title: "🎉Successful upload!",
  },
];

export default function UploadDone() {
  const [searchParams, setSearchParams] = useSearchParams();
  const formattedDate = searchParams.get("formattedDate");

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`/download?formattedDate=${formattedDate}`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${formattedDate}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    };
    if (formattedDate) {
      fetchData();
      setSearchParams("");
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
