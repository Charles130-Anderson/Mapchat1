import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
import type { Feature, Geometry } from "geojson";

interface ExportButtonsProps {
  features: Feature<Geometry, any>[];
}

function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(features: Feature<Geometry, any>[]) {
  const rows = features.map((f, idx) => {
    const base: Record<string, any> = {
      id: idx + 1,
      type: f.geometry.type,
      coordinates: JSON.stringify((f.geometry as any).coordinates),
    };
    const props = f.properties || {};
    return { ...base, ...props };
  });
  return Papa.unparse(rows);
}

function toKML(features: Feature<Geometry, any>[]) {
  const toCoords = (coords: any, type: string) => {
    if (type === "Point") return `${coords[0]},${coords[1]},0`;
    if (type === "LineString") return coords.map((c: any) => `${c[0]},${c[1]},0`).join(" ");
    if (type === "Polygon")
      return coords
        .map((ring: any) => `<LinearRing><coordinates>${ring
          .map((c: any) => `${c[0]},${c[1]},0`)
          .join(" ")}</coordinates></LinearRing>`) 
        .join("");
    return "";
  };

  const placemarks = features
    .map((f, i) => {
      const name = (f.properties && f.properties.name) || `Feature ${i + 1}`;
      if (f.geometry.type === "Point") {
        return `<Placemark><name>${name}</name><Point><coordinates>${toCoords(
          (f.geometry as any).coordinates,
          "Point"
        )}</coordinates></Point></Placemark>`;
      }
      if (f.geometry.type === "LineString") {
        return `<Placemark><name>${name}</name><LineString><coordinates>${toCoords(
          (f.geometry as any).coordinates,
          "LineString"
        )}</coordinates></LineString></Placemark>`;
      }
      if (f.geometry.type === "Polygon") {
        return `<Placemark><name>${name}</name><Polygon>${toCoords(
          (f.geometry as any).coordinates,
          "Polygon"
        )}</Polygon></Placemark>`;
      }
      return "";
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemarks}</Document></kml>`;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ features }) => {
  const counts = useMemo(() => {
    const point = features.filter((f) => f.geometry.type === "Point").length;
    const line = features.filter((f) => f.geometry.type === "LineString").length;
    const poly = features.filter((f) => f.geometry.type === "Polygon").length;
    return { point, line, poly, total: features.length };
  }, [features]);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground">
        {counts.total} features • {counts.point} pts • {counts.line} lines • {counts.poly} polys
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          const csv = toCSV(features);
          download("features.csv", csv, "text/csv;charset=utf-8;");
          toast({ title: "Exported CSV", description: "Your data has been downloaded." });
        }}
      >
        Export CSV
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          const kml = toKML(features);
          download("features.kml", kml, "application/vnd.google-earth.kml+xml");
          toast({ title: "Exported KML", description: "KML ready for Google Earth/Maps." });
        }}
      >
        Export KML
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({
            title: "PDF export coming soon",
            description: "We'll enable PDF once backend is connected.",
          })
        }
      >
        Export PDF
      </Button>
    </div>
  );
};

export default ExportButtons;
