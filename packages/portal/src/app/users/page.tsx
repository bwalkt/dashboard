import * as React from "react";
import { Skeleton } from "./skeleton";
import { PageContent } from "./table";

export default function Page({
  searchParams,
  title,
  description,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
  title?: string;
  description?: string;
}) {
  const search = searchParams;

  return (
    <React.Suspense fallback={<Skeleton />}>
      <PageContent search={search} title={title} description={description} />
    </React.Suspense>
  );
}
