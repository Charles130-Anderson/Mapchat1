import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Image as ImageIcon, FileJson2 } from "lucide-react";
import html2canvas from "html2canvas";

export async function exportNodeAsPng(node: HTMLElement, fileName: string) {
  const canvas = await html2canvas(node, { backgroundColor: "#ffffff", scale: 2 });
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${fileName}.png`;
  link.click();
}

export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({
  targetRef,
  fileBase,
  json,
  isPro,
}: {
  targetRef: React.RefObject<HTMLElement>;
  fileBase: string;
  json: unknown;
  isPro: boolean;
}) {
  const onExportPNG = async () => {
    if (!isPro) {
      toast({ title: "Pro feature", description: "Upgrade to export visualizations." });
      return;
    }
    if (targetRef.current) await exportNodeAsPng(targetRef.current, fileBase);
  };
  const onExportJSON = () => {
    if (!isPro) {
      toast({ title: "Pro feature", description: "Upgrade to export configs." });
      return;
    }
    downloadJson(json, fileBase);
  };
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onExportPNG} aria-label="Export PNG" className="hover-scale">
        <ImageIcon className="mr-1" /> Image
      </Button>
      <Button variant="outline" size="sm" onClick={onExportJSON} aria-label="Export JSON" className="hover-scale">
        <FileJson2 className="mr-1" /> JSON
      </Button>
    </div>
  );
}
