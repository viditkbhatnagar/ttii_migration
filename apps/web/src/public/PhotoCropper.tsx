import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// Ported from Naji's Lovable application-form design (scratchpad/appform). The
// only adaptation is wiring the imports to apps/web's shadcn components and
// scoping the (portaled) dialog to `counsellor-theme` so its buttons/slider
// pick up the orange application-form palette instead of the admin magenta
// that portaled Radix content otherwise inherits from :root.
async function getCroppedImg(imageSrc: string, area: Area, rotation: number): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bBoxW = image.width * cos + image.height * sin;
  const bBoxH = image.width * sin + image.height * cos;
  canvas.width = bBoxW;
  canvas.height = bBoxH;
  // Flatten onto white before drawing — the output is JPEG (no alpha), which
  // otherwise composites transparent source pixels (e.g. a PNG with alpha) onto
  // black. Fill first so transparency reads as white, not black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, bBoxW, bBoxH);
  ctx.translate(bBoxW / 2, bBoxH / 2);
  ctx.rotate(rad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  const data = ctx.getImageData(area.x, area.y, area.width, area.height);
  canvas.width = area.width;
  canvas.height = area.height;
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function PhotoCropper({
  imageSrc,
  open,
  onCancel,
  onConfirm,
}: {
  imageSrc: string | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels) return;
    setBusy(true);
    try {
      const cropped = await getCroppedImg(imageSrc, areaPixels, rotation);
      onConfirm(cropped);
    } catch {
      // Profile Photo is mandatory and this dialog is the only way to set it —
      // surface the failure instead of leaving "Apply" doing nothing silently.
      toast.error("Couldn't process this image. Try a smaller photo or a different file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="counsellor-theme apply-form-theme w-[calc(100vw-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Crop &amp; Adjust Photo</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-56 sm:h-72 bg-secondary rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Zoom</label>
            <Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={(v) => setZoom(v[0] ?? 1)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rotation</label>
            <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={(v) => setRotation(v[0] ?? 0)} />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={() => { void handleConfirm(); }} disabled={busy} className="w-full sm:w-auto">{busy ? "Applying…" : "Apply"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
