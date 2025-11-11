import { addDays } from "date-fns";
import type { FastifyInstance } from "fastify";
import SuperJSON from "superjson";
import {
  filterData,
  getFacetsFromData,
  groupChartData,
  percentileData,
  sliderFilterValues,
  sortData,
  splitData,
} from "../utils/data-table-helpers";
import { mock, mockLive } from "../utils/data-table-mock";
import { calculateSpecificPercentile } from "../utils/percentile";

// Define types from the portal package - we'll need to move these to shared
interface SearchParams {
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
  date?: Date[];
  [key: string]: any;
}

interface InfiniteQueryResponse<TData, TMeta> {
  data: TData;
  meta: TMeta;
  prevCursor: number | null;
  nextCursor: number | null;
}

interface LogsMeta {
  totalRowCount: number;
  filterRowCount: number;
  chartData: any[];
  facets: Record<string, any>;
  metadata: {
    currentPercentiles: Record<string, number>;
  };
}

export async function dataTableRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/api/data-table/infinite", async (request, reply) => {
    const search = request.query as SearchParams;
    const totalData = [...mockLive, ...mock];

    const _date =
      search.date?.length === 1
        ? [search.date[0], addDays(search.date[0], 1)]
        : search.date;

    // Filter out the slider values because they are not part of the search params
    const _rest = Object.fromEntries(
      Object.entries(search).filter(
        ([key]) => !sliderFilterValues.includes(key as any),
      ),
    );

    const rangedData = filterData(totalData, { date: _date });
    const withoutSliderData = filterData(rangedData, { ..._rest, date: null });

    const filteredData = filterData(withoutSliderData, {
      ...search,
      date: null,
    });
    const chartData = groupChartData(filteredData, _date);
    const sortedData = sortData(filteredData, search.sort);
    const withoutSliderFacets = getFacetsFromData(withoutSliderData);
    const facets = getFacetsFromData(filteredData);
    const withPercentileData = percentileData(sortedData);
    const data = splitData(withPercentileData, search);

    const latencies = withPercentileData.map(({ latency }) => latency);
    const currentPercentiles = {
      50: calculateSpecificPercentile(latencies, 50),
      75: calculateSpecificPercentile(latencies, 75),
      90: calculateSpecificPercentile(latencies, 90),
      95: calculateSpecificPercentile(latencies, 95),
      99: calculateSpecificPercentile(latencies, 99),
    };

    const nextCursor =
      data.length > 0 ? data[data.length - 1].date.getTime() : null;
    const prevCursor =
      data.length > 0 ? data[0].date.getTime() : new Date().getTime();

    const response = SuperJSON.stringify({
      data,
      meta: {
        totalRowCount: totalData.length,
        filterRowCount: filteredData.length,
        chartData,
        // Separate the slider for keeping the min/max facets of the slider fields
        facets: {
          ...withoutSliderFacets,
          ...Object.fromEntries(
            Object.entries(facets).filter(
              ([key]) => !sliderFilterValues.includes(key as any),
            ),
          ),
        },
        metadata: { currentPercentiles },
      },
      prevCursor,
      nextCursor,
    } satisfies InfiniteQueryResponse<any[], LogsMeta>);

    return reply.type("application/json").send(response);
  });
}
