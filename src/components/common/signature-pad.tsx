"use client";


import { useTranslations } from 'next-intl';
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eraser, Check, X, PenTool, Type } from "lucide-react";

interface SignaturePadProps {
  onConfirm: (signatureDataUrl: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
  language?: "ar" | "en";
}

export default function SignaturePad({
  onConfirm,
  onCancel,
  width = 500,
  height = 200,
  language = "ar",
}: SignaturePadProps) {
  const tAuto = useTranslations();
  const isAr = language === "ar";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");

  // Check if we're in dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const strokeColor = isDark ? "#6B9BD2" : "#133371";

  // Resize canvas to fill container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = Math.max(rect.width, 200);
    const h = height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = strokeColor;
    }
  }, [height, strokeColor]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Get position relative to canvas
  const getPosition = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ("touches" in e) e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const pos = getPosition(e);
    if (!ctx || !pos) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    if ("touches" in e) e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const pos = getPosition(e);
    if (!ctx || !pos) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
  };

  // Generate typed name as signature image
  const generateTypedSignature = useCallback((): string => {
    const canvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(width, 300);
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.scale(dpr, dpr);
    // White background for PDFs
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    // Draw the name in a script-like font
    ctx.fillStyle = strokeColor;
    ctx.font = `italic 32px "Georgia", "Times New Roman", serif`;
    ctx.textAlign = isAr ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, isAr ? w - 20 : 20, h / 2);

    return canvas.toDataURL("image/png");
  }, [typedName, width, height, strokeColor, isAr]);

  const confirmSignature = () => {
    if (mode === "type") {
      if (!typedName.trim()) return;
      const dataUrl = generateTypedSignature();
      onConfirm(dataUrl);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Create a new canvas with white background for PDFs
    const exportCanvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    // White background
    ctx.fillStyle = "#FFFFFF";
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.fillRect(0, 0, w, h);

    // Draw signature on top
    ctx.drawImage(canvas, 0, 0, w, h);

    const dataUrl = exportCanvas.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  const canConfirm = mode === "draw" ? hasDrawn : typedName.trim().length > 0;

  return (
    <div className="space-y-3" dir={isAr ? "rtl" : "ltr"}>
      {/* Label */}
      <Label className="text-sm font-medium text-foreground">
        {tAuto('auto.Signature')}
      </Label>

      {/* Mode tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "draw" | "type")}>
        <TabsList className="grid grid-cols-2 w-48">
          <TabsTrigger value="draw" className="gap-1.5 text-xs">
            <PenTool className="h-3.5 w-3.5" />
            {tAuto('auto.draw')}
          </TabsTrigger>
          <TabsTrigger value="type" className="gap-1.5 text-xs">
            <Type className="h-3.5 w-3.5" />
            {tAuto('auto.type')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Draw mode */}
      {mode === "draw" && (
        <div
          ref={containerRef}
          className="relative border-2 border-dashed rounded-lg overflow-hidden bg-white dark:bg-slate-900"
          style={{ height }}
        >
          <canvas
            ref={canvasRef}
            className="w-full touch-none cursor-crosshair"
            style={{ height }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-muted-foreground/40 text-sm select-none">
                {tAuto('auto.signHere')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Type mode */}
      {mode === "type" && (
        <div
          className="border-2 border-dashed rounded-lg bg-white dark:bg-slate-900 p-4 flex flex-col items-center justify-center"
          style={{ height }}
        >
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={tAuto('auto.typeYourNameHere')}
            className="text-center text-2xl font-serif italic border-none shadow-none focus-visible:ring-0 bg-transparent"
            style={{ color: strokeColor }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {mode === "draw" && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="gap-1.5"
              disabled={!hasDrawn}
            >
              <Eraser className="h-3.5 w-3.5" />
              {tAuto('auto.clear')}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            {tAuto('auto.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={confirmSignature}
            disabled={!canConfirm}
            className="gap-1.5 bg-[#133371] hover:bg-[#0f2855] text-white"
          >
            <Check className="h-3.5 w-3.5" />
            {tAuto('auto.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
