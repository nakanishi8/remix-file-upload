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

import { Link, Outlet, json } from "@remix-run/react";
import { Separator } from "~/components/ui/separator.tsx";
import { nanoid } from "nanoid";

export function loader() {
  const uploadId = nanoid();

  return json({ uploadId });
}

export default function Index() {
  return (
    <div className="space-y-6 p-10 pb-16 md:block">
      <div className="space-y-6 md:space-y-0.5 flex flex-col md:flex-row">
        <h2 className="text-xl font-extrabold tracking-tight flex-1">
          <Link to="/upload/advanced">Jetty Log Parser</Link>
        </h2>
      </div>
      <Separator className="my-6" />

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5 flex flex-col gap-10 h-full"></aside>
        <div className="flex-1 lg:max-w-3xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
