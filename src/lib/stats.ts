import { CONTINENTS, COUNTRIES, TOTAL_COUNTRY_COUNT, type Continent } from '@/constants/countries';

export type ContinentStat = {
  continent: Continent;
  visitedCount: number;
  totalCount: number;
  percent: number;
};

export type TravelStats = {
  visitedCount: number;
  totalCount: number;
  percent: number;
  byContinent: ContinentStat[];
};

export function computeTravelStats(visited: Set<string>): TravelStats {
  const byContinent = CONTINENTS.map((continent) => {
    const countriesInContinent = COUNTRIES.filter((c) => c.continent === continent);
    const visitedCount = countriesInContinent.filter((c) => visited.has(c.code)).length;
    const totalCount = countriesInContinent.length;
    return {
      continent,
      visitedCount,
      totalCount,
      percent: totalCount === 0 ? 0 : Math.round((visitedCount / totalCount) * 100),
    };
  });

  const visitedCount = visited.size;
  return {
    visitedCount,
    totalCount: TOTAL_COUNTRY_COUNT,
    percent: Math.round((visitedCount / TOTAL_COUNTRY_COUNT) * 100),
    byContinent,
  };
}
