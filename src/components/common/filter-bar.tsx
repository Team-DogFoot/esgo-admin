"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  searchPlaceholder?: string;
  filters?: FilterConfig[];
}

export function FilterBar({ searchPlaceholder = "검색...", filters = [] }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        params.delete("page");
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchValue.trim()) {
          params.set("search", searchValue.trim());
        } else {
          params.delete("search");
        }
        params.delete("page");
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, searchValue, startTransition],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-64 pl-9"
        />
        {isPending && (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={searchParams.get(filter.key) ?? "all"}
          onValueChange={(value) => handleFilterChange(filter.key, value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.label} (전체)</SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
