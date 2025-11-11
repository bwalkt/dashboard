import * as React from "react";
import { Client } from "./client";

export default function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // In Vite/React, we don't need to prefetch on the server side
  // The Client component will handle data fetching client-side
  return (
    <div className="h-full w-full">
      <Client />
    </div>
  );
}
