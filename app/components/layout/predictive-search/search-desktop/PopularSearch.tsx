import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

const MAX_POPULAR_SEARCHES = 5;

const POPULAR_SEARCHES = [
  "chair",
  "barrel chair",
  "play chair",
  "ourf chair",
  "balcony chair",
];

export function PopularSearch() {

  const [topSearches, setTopSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("searchHistory")
          : null;
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const counts = new Map<string, number>();
        for (const term of parsed) {
          const t = String(term || "").trim();
          if (!t) { continue; }
          counts.set(t, (counts.get(t) || 0) + 1);
        }
        const sorted = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([t]) => t)
          .slice(0, MAX_POPULAR_SEARCHES);
        setTopSearches(sorted);
      }
    } catch {
      // ignore
    }
  }, []);

  const displaySearches = useMemo(() => {
    if (topSearches.length > 0) { return topSearches; }
    return POPULAR_SEARCHES.slice(0, MAX_POPULAR_SEARCHES);
  }, [topSearches]);

  return (
    <div className="mx-auto flex max-w-(--page-width) flex-col gap-4 pb-6">
      <span className="font-normal uppercase">Popular Searches</span>
      <ul className="flex flex-col gap-2">
        {displaySearches.map((search, index) => (
          <li key={index}>
            <Link
              to={`/search?q=${encodeURIComponent(search)}`}
              className="block w-fit transition-transform duration-200 hover:-translate-y-1"
            >
              <span className="text-sm">{search}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
