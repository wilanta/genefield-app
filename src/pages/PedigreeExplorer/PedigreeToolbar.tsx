import { useTranslation } from "@/components/language-provider";
import { useState } from "react";
import {
  Search,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PedigreeToolbarProps {
  ancestors: number;
  descendants: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onSearch?: (id: string) => void;
}

export function PedigreeToolbar({
  ancestors,
  descendants,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  onSearch,
}: PedigreeToolbarProps) {
  const { t: tr } = useTranslation();
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-[34px] items-center gap-3">
      {/* Search input with LINE_ID placeholder */}
      <div className="relative w-48">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) onSearch?.(query.trim());
          }}
          placeholder={tr("Search LINE_ID")}
          className="pl-9 bg-card"
          aria-label={tr("Search LINE_ID")}
        />
      </div>

      {/* Ancestor count chip */}
      <Badge
        variant="outline"
        className="gap-1.5 h-8.5 py-0 rounded-lg text-muted-foreground bg-card"
      >
        <span>
          {tr("Ancestors")} <span className="tabular-nums">{ancestors}</span>
        </span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </Badge>

      {/* Descendant count chip */}
      <Badge
        variant="outline"
        className="gap-1.5 h-8.5 py-0 rounded-lg text-muted-foreground bg-card"
      >
        <span>
          {tr("Descendants")}{" "}
          <span className="tabular-nums">{descendants}</span>
        </span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </Badge>

      <div className="ml-auto flex items-center gap-2">
        {/* Zoom in */}
        <Button
          variant="outline"
          size="icon"
          className="h-[34px] w-[34px]"
          onClick={onZoomIn}
          aria-label={tr("Zoom in")}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {/* Zoom out */}
        <Button
          variant="outline"
          size="icon"
          className="h-[34px] w-[34px]"
          onClick={onZoomOut}
          aria-label={tr("Zoom out")}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        {/* Fit to view */}
        <Button
          variant="outline"
          size="icon"
          className="h-[34px] w-[34px]"
          onClick={onFit}
          aria-label={tr("Fit to view")}
        >
          <Maximize className="h-4 w-4" />
        </Button>

        {/* Reset Graph */}
        <Button variant="outline" className="h-[34px]" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {tr("Reset Graph")}
        </Button>
      </div>
    </div>
  );
}
