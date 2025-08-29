  import React, { useCallback, useMemo, useRef, useState } from "react";
  import { MapContainer, TileLayer, FeatureGroup } from "react-leaflet";
  import { EditControl } from "react-leaflet-draw";
  import type { Feature, FeatureCollection, Geometry } from "geojson";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import "leaflet-draw/dist/leaflet.draw.css";
  import marker2x from "leaflet/dist/images/marker-icon-2x.png";
  import marker1x from "leaflet/dist/images/marker-icon.png";
  import markerShadow from "leaflet/dist/images/marker-shadow.png";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import ExportButtons from "./ExportButtons";
  import CommentsPanel from "./CommentsPanel";
  import Papa from "papaparse";
  import { toast } from "@/hooks/use-toast";
  import { useAuth } from "@/hooks/useAuth";
  import { supabase } from "@/integrations/supabase/client";

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: marker2x,
    iconUrl: marker1x,
    shadowUrl: markerShadow,
  });

  const MapView: React.FC = () => {
    const { user } = useAuth();
    const featureGroupRef = useRef<L.FeatureGroup | null>(null);
    const [features, setFeatures] = useState<Feature<Geometry, any>[]>([]);
    const [selectedFeature, setSelectedFeature] = useState<{
      id: string;
      coordinates?: any;
      geometry?: any;
    } | null>(null);
    const [userTier, setUserTier] = useState<string>('free');

    // Fetch user subscription tier
    React.useEffect(() => {
      if (user) {
        const fetchUserTier = async () => {
          const { data } = await supabase
            .from('user_subscriptions')
            .select('tier')
            .eq('user_id', user.id)
            .single();
          
          if (data?.tier) {
            setUserTier(data.tier);
          }
        };
        fetchUserTier();
      }
    }, [user]);

    const rebuildFromLayers = useCallback(() => {
      const layers = (featureGroupRef.current?.getLayers?.() as L.Layer[]) || [];
      const all: Feature<Geometry, any>[] = [];
      layers.forEach((l: any) => {
        if (typeof l.toGeoJSON === "function") {
          const gj = l.toGeoJSON();
          if (gj && (gj as any).type) {
            if ((gj as any).type === "FeatureCollection") {
              (gj as any).features.forEach((f: any) => all.push(f));
            } else {
              all.push(gj as any);
            }
          }
        }
      });
      setFeatures(all);
      setupFeatureClickHandlers();
    }, []);

    const setupFeatureClickHandlers = useCallback(() => {
      const layers = (featureGroupRef.current?.getLayers?.() as L.Layer[]) || [];
      layers.forEach((layer: any) => {
        if (layer.on) {
          layer.off('click'); // Remove existing handlers
          layer.on('click', () => {
            const geoJson = layer.toGeoJSON();
            const featureId = layer._leaflet_id || `feature_${Date.now()}`;
            
            setSelectedFeature({
              id: featureId.toString(),
              coordinates: geoJson.geometry.coordinates,
              geometry: geoJson.geometry,
            });
          });
        }
      });
    }, []);

    const onCreated = useCallback(() => {
      setTimeout(() => {
        rebuildFromLayers();
      }, 100);
    }, [rebuildFromLayers]);

    const onEdited = useCallback(() => {
      rebuildFromLayers();
    }, [rebuildFromLayers]);

    const onDeleted = useCallback(() => {
      rebuildFromLayers();
    }, [rebuildFromLayers]);

    const onUpload = useCallback((file: File) => {
      const name = file.name.toLowerCase();
      if (name.endsWith(".geojson") || name.endsWith(".json")) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const gj = JSON.parse(String(reader.result));
            const fc: FeatureCollection = gj.type === "FeatureCollection" ? gj : { type: "FeatureCollection", features: [gj] };
            setFeatures((prev) => [...prev, ...fc.features]);
            toast({ title: "GeoJSON loaded", description: `${fc.features.length} features added.` });
          } catch (e) {
            toast({ title: "Invalid GeoJSON", description: "Please check the file format." });
          }
        };
        reader.readAsText(file);
      } else if (name.endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const feats: Feature<Geometry, any>[] = (results.data as any[])
                .map((row) => {
                  const lat = parseFloat(row.lat ?? row.latitude ?? row.Latitude);
                  const lng = parseFloat(row.lng ?? row.lon ?? row.longitude ?? row.Longitude);
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const { lat: _lat, latitude: _latitude, lng: _lng, lon: _lon, longitude: _longitude, Latitude: _Lat, Longitude: _Lon, ...props } = row;
                    return {
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [lng, lat] },
                      properties: props,
                    } as Feature;
                  }
                  return null;
                })
                .filter(Boolean) as Feature<Geometry, any>[];
              setFeatures((prev) => [...prev, ...feats]);
              toast({ title: "CSV loaded", description: `${feats.length} points added.` });
            } catch (e) {
              toast({ title: "CSV error", description: "Could not parse rows." });
            }
          },
        });
      } else {
        toast({ title: "Unsupported file", description: "Use CSV or GeoJSON for now." });
      }
    }, []);

    const freeLimitReached = useMemo(() => features.filter((f) => f.geometry.type === "Point").length >= 20, [features]);

    return (
      <main className="container py-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Community Map</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">
              Upload CSV/GeoJSON
              <input
                type="file"
                accept=".csv,.geojson,.json"
                className="ml-2"
                onChange={(e) => e.target.files && onUpload(e.target.files[0])}
              />
            </label>
            <ExportButtons features={features} />
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="h-[70vh]">
            <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" preferCanvas>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FeatureGroup ref={featureGroupRef as any}>
                <EditControl
                  position="topleft"
                  onCreated={onCreated as any}
                  onEdited={onEdited as any}
                  onDeleted={onDeleted as any}
                  draw={{
                    circle: false,
                    circlemarker: false,
                    rectangle: false,
                    marker: !freeLimitReached,
                    polyline: true,
                    polygon: true,
                  }}
                  edit={{ remove: true }}
                />
              </FeatureGroup>
            </MapContainer>
          </div>
        </Card>

        {freeLimitReached && (
          <div className="mt-3 text-sm text-muted-foreground">
            You reached the Free tier limit of 20 markers. Upgrade on the Pricing page for unlimited markers.
          </div>
        )}

        <CommentsPanel
          featureId={selectedFeature?.id || ''}
          featureCoordinates={selectedFeature?.coordinates}
          featureGeometry={selectedFeature?.geometry}
          isVisible={!!selectedFeature}
          onClose={() => setSelectedFeature(null)}
          userTier={userTier}
        />
      </main>
    );
  };

  export default MapView;
