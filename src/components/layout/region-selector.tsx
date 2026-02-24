"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Region } from "@/lib/regions";

interface RegionSelectorProps {
  regions: Region[];
  currentRegionId: string | null;
}

export function RegionSelector({ regions, currentRegionId }: RegionSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (regionId: string) => {
    const segments = pathname.split("/");
    segments[1] = regionId;
    router.push(segments.join("/"));
  };

  if (!currentRegionId) return null;

  return (
    <Select value={currentRegionId} onValueChange={handleChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {regions.map((region) => (
          <SelectItem key={region.id} value={region.id}>
            {region.flag} {region.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
