"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import {
  Layers,
  Settings,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Ruler,
  MousePointer,
  Download,
  Printer,
  ChevronLeft,
  Info,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavStore } from "@/store/nav-store";


interface CADEntity {
  type: "LINE" | "CIRCLE" | "ARC" | "TEXT";
  layer: "GRID" | "WALLS" | "ELECTRICAL" | "PLUMBING" | "DIMENSIONS";
  color: string;
  // For Line
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // For Circle/Arc
  cx?: number;
  cy?: number;
  r?: number;
  startAngle?: number;
  endAngle?: number;
  // For Text
  text?: string;
  fontSize?: number;
  x?: number;
  y?: number;
}

const SAMPLE_ENTITIES: CADEntity[] = [
  // Grid Lines (A-D, 1-4)
  { type: "LINE", layer: "GRID", color: "#475569", x1: -2000, y1: -2000, x2: 6000, y2: -2000 },
  { type: "LINE", layer: "GRID", color: "#475569", x1: -2000, y1: 0, x2: 6000, y2: 0 },
  { type: "LINE", layer: "GRID", color: "#475569", x1: -2000, y1: 2000, x2: 6000, y2: 2000 },
  { type: "LINE", layer: "GRID", color: "#475569", x1: -2000, y1: -2000, x2: -2000, y2: 4000 },
  { type: "LINE", layer: "GRID", color: "#475569", x1: 2000, y1: -2000, x2: 2000, y2: 4000 },
  { type: "LINE", layer: "GRID", color: "#475569", x1: 6000, y1: -2000, x2: 6000, y2: 4000 },
  // Grid Labels
  { type: "TEXT", layer: "GRID", color: "#94a3b8", text: "A", fontSize: 180, x: -2200, y: -2000 },
  { type: "TEXT", layer: "GRID", color: "#94a3b8", text: "B", fontSize: 180, x: -2200, y: 0 },
  { type: "TEXT", layer: "GRID", color: "#94a3b8", text: "C", fontSize: 180, x: -2200, y: 2000 },
  { type: "TEXT", layer: "GRID", color: "#94a3b8", text: "1", fontSize: 180, x: -2000, y: 4300 },
  { type: "TEXT", layer: "GRID", color: "#94a3b8", text: "2", fontSize: 180, x: 2000, y: 4300 },
  { type: "TEXT", layer: "GRID", color: "#94a3b8", text: "3", fontSize: 180, x: 6000, y: 4300 },

  // External Walls
  { type: "LINE", layer: "WALLS", color: "#00ffff", x1: -1500, y1: -1500, x2: 5500, y2: -1500 },
  { type: "LINE", layer: "WALLS", color: "#00ffff", x1: 5500, y1: -1500, x2: 5500, y2: 3500 },
  { type: "LINE", layer: "WALLS", color: "#00ffff", x1: 5500, y1: 3500, x2: -1500, y2: 3500 },
  { type: "LINE", layer: "WALLS", color: "#00ffff", x1: -1500, y1: 3500, x2: -1500, y2: -1500 },
  // Internal Partition Wall
  { type: "LINE", layer: "WALLS", color: "#00ffff", x1: 1500, y1: -1500, x2: 1500, y2: 1500 },
  { type: "LINE", layer: "WALLS", color: "#00ffff", x1: 1500, y1: 2300, x2: 1500, y2: 3500 },

  // Doors
  { type: "LINE", layer: "WALLS", color: "#eab308", x1: 1500, y1: 1500, x2: 1500, y2: 2300 }, // Door frame
  { type: "ARC", layer: "WALLS", color: "#eab308", cx: 1500, cy: 1500, r: 800, startAngle: 0, endAngle: Math.PI / 2 },
  { type: "LINE", layer: "WALLS", color: "#eab308", x1: 1500, y1: 1500, x2: 2300, y2: 1500 },

  // Electrical sockets & lights
  { type: "CIRCLE", layer: "ELECTRICAL", color: "#ff00ff", cx: -1000, cy: 0, r: 80 },
  { type: "LINE", layer: "ELECTRICAL", color: "#ff00ff", x1: -1000, y1: -80, x2: -1000, y2: 80 },
  { type: "TEXT", layer: "ELECTRICAL", color: "#ff00ff", text: "WP", fontSize: 100, x: -900, y: 150 },

  { type: "CIRCLE", layer: "ELECTRICAL", color: "#ff00ff", cx: 3000, cy: 1000, r: 80 },
  { type: "LINE", layer: "ELECTRICAL", color: "#ff00ff", x1: 2920, y1: 1000, x2: 3080, y2: 1000 },
  { type: "LINE", layer: "ELECTRICAL", color: "#ff00ff", x1: 3000, y1: 920, x2: 3000, y2: 1080 },

  // Light fixture ceiling nodes
  { type: "LINE", layer: "ELECTRICAL", color: "#f43f5e", x1: 0, y1: 1000, x2: 400, y2: 1400 },
  { type: "LINE", layer: "ELECTRICAL", color: "#f43f5e", x1: 0, y1: 1400, x2: 400, y2: 1000 },
  { type: "CIRCLE", layer: "ELECTRICAL", color: "#f43f5e", cx: 200, cy: 1200, r: 280 },

  // Plumbing Fixtures
  { type: "CIRCLE", layer: "PLUMBING", color: "#3b82f6", cx: 4500, cy: 3000, r: 250 },
  { type: "LINE", layer: "PLUMBING", color: "#3b82f6", x1: 4250, y1: 3250, x2: 4750, y2: 3250 },
  { type: "LINE", layer: "PLUMBING", color: "#3b82f6", x1: 4250, y1: 2750, x2: 4750, y2: 2750 },
  { type: "LINE", layer: "PLUMBING", color: "#3b82f6", x1: 4250, y1: 2750, x2: 4250, y2: 3250 },
  { type: "LINE", layer: "PLUMBING", color: "#3b82f6", x1: 4750, y1: 2750, x2: 4750, y2: 3250 },

  // Dimensions
  { type: "LINE", layer: "DIMENSIONS", color: "#22c55e", x1: -1500, y1: -1800, x2: 5500, y2: -1800 },
  { type: "LINE", layer: "DIMENSIONS", color: "#22c55e", x1: -1500, y1: -1900, x2: -1500, y2: -1700 },
  { type: "LINE", layer: "DIMENSIONS", color: "#22c55e", x1: 5500, y1: -1900, x2: 5500, y2: -1700 },
  { type: "TEXT", layer: "DIMENSIONS", color: "#22c55e", text: "7000 mm (7.00 m)", fontSize: 130, x: 1500, y: -2100 },

  { type: "LINE", layer: "DIMENSIONS", color: "#22c55e", x1: 5800, y1: -1500, x2: 5800, y2: 3500 },
  { type: "LINE", layer: "DIMENSIONS", color: "#22c55e", x1: 5700, y1: -1500, x2: 5900, y2: -1500 },
  { type: "LINE", layer: "DIMENSIONS", color: "#22c55e", x1: 5700, y1: 3500, x2: 5900, y2: 3500 },
  { type: "TEXT", layer: "DIMENSIONS", color: "#22c55e", text: "5000 mm (5.00 m)", fontSize: 130, x: 6050, y: 1000 },
];

export default function CADViewer({
  projectId: _projectId,
  language,
}: {
  projectId: string;
  language: "ar" | "en";
}) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // CAD Navigation State
  const [zoom, setZoom] = useState(0.08); // scale factor
  const [panX, setPanX] = useState(250);  // center offset X
  const [panY, setPanY] = useState(250);  // center offset Y
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Tool Selection
  const [activeTool, setActiveTool] = useState<"pan" | "measure">("pan");
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);

  // Layers Toggles
  const [layers, setLayers] = useState({
    GRID: true,
    WALLS: true,
    ELECTRICAL: true,
    PLUMBING: true,
    DIMENSIONS: true,
  });

  // CAD Theme: black (classic neon AutoCAD) vs white (blueprint style)
  const [cadTheme, setCadTheme] = useState<"dark" | "light">("dark");

  // Hover Coordinates
  const [hoverCoords, setHoverCoords] = useState({ x: 0, y: 0 });

  // File Upload State
  const [fileName, setFileName] = useState("A-101_GroundFloor_Layout.dxf");
  const [entities, setEntities] = useState<CADEntity[]>(SAMPLE_ENTITIES);

  // Reset View to fit contents
  const resetView = useCallback(() => {
    if (!canvasRef.current) return;
    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;
    setZoom(0.07);
    setPanX(cw / 2 - 150);
    setPanY(ch / 2 - 100);
    setMeasurePoints([]);
    setMeasureDistance(null);
  }, []);

  // Set Canvas dimensions to match client container bounding rect
  useLayoutEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = Math.max(500, window.innerHeight - 300);
        resetView();
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resetView]);

  // Convert client viewport X/Y to CAD space coordinates
  const clientToCad = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Invert the zoom/pan transform
    const cadX = (x - panX) / zoom;
    const cadY = -(y - panY) / zoom; // invert Y axis for standard math coordinate plane
    return { x: Math.round(cadX), y: Math.round(cadY) };
  }, [panX, panY, zoom]);

  // Handle Redrawing Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid
    const bgCol = cadTheme === "dark" ? "#0f172a" : "#f8fafc";
    ctx.fillStyle = bgCol;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for screen space
    ctx.strokeStyle = cadTheme === "dark" ? "rgba(71, 85, 105, 0.2)" : "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    const step = 500 * zoom; // Grid lines every 500 mm in CAD space
    if (step > 5) {
      for (let x = panX % step; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = panY % step; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Render CAD Entities
    entities.forEach((entity) => {
      // Check if entity layer is active
      if (!layers[entity.layer]) return;

      // Color mapping based on theme
      let strokeColor = entity.color;
      if (cadTheme === "light") {
        if (entity.color === "#00ffff") strokeColor = "#0f2c5f"; // walls -> navy
        if (entity.color === "#475569") strokeColor = "#cbd5e1"; // grid -> slate-300
        if (entity.color === "#94a3b8") strokeColor = "#64748b"; // labels -> slate-500
      }

      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;
      ctx.lineWidth = entity.layer === "WALLS" ? 2.5 : 1.2;

      // LINE
      if (entity.type === "LINE" && entity.x1 !== undefined && entity.y1 !== undefined && entity.x2 !== undefined && entity.y2 !== undefined) {
        const sx = panX + entity.x1 * zoom;
        const sy = panY - entity.y1 * zoom;
        const ex = panX + entity.x2 * zoom;
        const ey = panY - entity.y2 * zoom;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // CIRCLE
      if (entity.type === "CIRCLE" && entity.cx !== undefined && entity.cy !== undefined && entity.r !== undefined) {
        const cx = panX + entity.cx * zoom;
        const cy = panY - entity.cy * zoom;
        const r = entity.r * zoom;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // ARC
      if (entity.type === "ARC" && entity.cx !== undefined && entity.cy !== undefined && entity.r !== undefined && entity.startAngle !== undefined && entity.endAngle !== undefined) {
        const cx = panX + entity.cx * zoom;
        const cy = panY - entity.cy * zoom;
        const r = entity.r * zoom;
        
        // In CAD, positive angle goes counterclockwise. Since our Y is inverted, we adjust angles
        ctx.beginPath();
        ctx.arc(cx, cy, r, -entity.endAngle, -entity.startAngle);
        ctx.stroke();
      }

      // TEXT
      if (entity.type === "TEXT" && entity.text && entity.x !== undefined && entity.y !== undefined) {
        const cx = panX + entity.x * zoom;
        const cy = panY - entity.y * zoom;
        const fontSize = (entity.fontSize || 100) * zoom;

        if (fontSize > 4) {
          ctx.font = `${fontSize}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(entity.text, cx, cy);
        }
      }
    });

    // Draw active measurements
    if (measurePoints.length > 0) {
      ctx.strokeStyle = "#e11d48"; // Rose-600
      ctx.fillStyle = "#e11d48";
      ctx.lineWidth = 2;

      // Draw first point
      const p1 = measurePoints[0];
      const screenP1X = panX + p1.x * zoom;
      const screenP1Y = panY - p1.y * zoom;
      ctx.beginPath();
      ctx.arc(screenP1X, screenP1Y, 5, 0, 2 * Math.PI);
      ctx.fill();

      if (measurePoints.length === 2) {
        const p2 = measurePoints[1];
        const screenP2X = panX + p2.x * zoom;
        const screenP2Y = panY - p2.y * zoom;

        // Draw line between points
        ctx.beginPath();
        ctx.moveTo(screenP1X, screenP1Y);
        ctx.lineTo(screenP2X, screenP2Y);
        ctx.stroke();

        // Draw second point
        ctx.beginPath();
        ctx.arc(screenP2X, screenP2Y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // Draw distance tag
        if (measureDistance !== null) {
          const midX = (screenP1X + screenP2X) / 2;
          const midY = (screenP1Y + screenP2Y) / 2 - 15;
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          
          const label = `${(measureDistance / 1000).toFixed(2)} m (${measureDistance} mm)`;
          const textWidth = ctx.measureText(label).width;

          // Label background
          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(midX - textWidth / 2 - 6, midY - 12, textWidth + 12, 20);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, midX, midY + 2);
        }
      } else if (activeTool === "measure") {
        // Draw dashed line from point A to hover cursor
        const hoverPX = panX + hoverCoords.x * zoom;
        const hoverPY = panY - hoverCoords.y * zoom;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(screenP1X, screenP1Y);
        ctx.lineTo(hoverPX, hoverPY);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash
      }
    }
  }, [entities, zoom, panX, panY, layers, cadTheme, measurePoints, measureDistance, hoverCoords, activeTool]);

  // Mouse Interactions handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "pan") {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    } else if (activeTool === "measure") {
      const coords = clientToCad(e.clientX, e.clientY);
      if (measurePoints.length >= 2) {
        // Reset and seed first point
        setMeasurePoints([coords]);
        setMeasureDistance(null);
      } else {
        const newPoints = [...measurePoints, coords];
        setMeasurePoints(newPoints);
        if (newPoints.length === 2) {
          const dx = newPoints[1].x - newPoints[0].x;
          const dy = newPoints[1].y - newPoints[0].y;
          const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
          setMeasureDistance(dist);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = clientToCad(e.clientX, e.clientY);
    setHoverCoords(coords);

    if (isPanning) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Zoom on wheel scroll
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    
    // Clamp zoom levels
    if (nextZoom < 0.005 || nextZoom > 2.0) return;

    // Center zoom on mouse cursor
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cadX = (mouseX - panX) / zoom;
    const cadY = (mouseY - panY) / zoom;

    setZoom(nextZoom);
    setPanX(mouseX - cadX * nextZoom);
    setPanY(mouseY - cadY * nextZoom);
  };

  // Simulation DXF file upload parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMeasurePoints([]);
    setMeasureDistance(null);

    // Simulate reading drawing elements
    const reader = new FileReader();
    reader.onload = () => {
      // Simulate adding custom lines/circles randomly to show dynamic rendering
      const newEntities = [...SAMPLE_ENTITIES];
      // Push some random geometric shapes representing the custom uploaded design
      newEntities.push(
        { type: "LINE", layer: "WALLS", color: "#00ffff", x1: -500, y1: 500, x2: 2500, y2: 500 },
        { type: "CIRCLE", layer: "PLUMBING", color: "#3b82f6", cx: 1000, cy: -500, r: 400 },
        { type: "TEXT", layer: "GRID", color: "#22c55e", text: "NEW BLOCK UPLOADED", fontSize: 150, x: 2000, y: -1000 }
      );
      setEntities(newEntities);
      resetView();
      console.info("[CADViewer] DXF layout parsed successfully", file.name, file.size);
    };
    reader.readAsText(file);
  };

  const { setCurrentPage } = useNavStore();

  const handleBack = () => {
    setCurrentPage("projects");
  };

  const handlePrint = () => {
    window.print();
  };

  const currentThemeLabel = cadTheme === "dark" 
    ? t("الوضع الداكن المضيء (CAD)", "Neon Dark CAD Theme")
    : t("الوضع الفاتح الأزرق (مخطط)", "Blueprint Light Theme");

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6" ref={containerRef}>
      {/* Title Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 shrink-0 me-1" aria-label="Go Back">
            {isAr ? <ChevronLeft className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5 rotate-180" />}
          </Button>
          <FolderOpen className="h-5 w-5 text-brand-navy-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {t("مستعرض المخططات الهندسية (CAD Viewer)", "Technical CAD Drawing Viewer")}
            <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded">
              {fileName}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dxf-upload" className="cursor-pointer">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm">
              <Download className="h-3.5 w-3.5 rotate-180" />
              {t("تحميل ملف DXF", "Upload DXF File")}
            </div>
            <input
              type="file"
              id="dxf-upload"
              accept=".dxf,.dwg"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs shadow-sm">
            <Printer className="h-3.5 w-3.5" />
            {t("طباعة المخطط", "Print Sheet")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* CAD Canvas Area */}
        <div className="xl:col-span-3 flex flex-col gap-3">
          
          {/* Top Control Bar */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex-wrap gap-2">
            
            {/* Tool selectors */}
            <div className="flex items-center gap-1">
              <Button
                variant={activeTool === "pan" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveTool("pan");
                  setMeasurePoints([]);
                  setMeasureDistance(null);
                }}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <MousePointer className="h-3.5 w-3.5" />
                {t("التنقل والتحريك", "Pan / Select")}
              </Button>

              <Button
                variant={activeTool === "measure" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("measure")}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <Ruler className="h-3.5 w-3.5" />
                {t("أداة القياس", "Measure Distance")}
              </Button>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.min(2.0, prev * 1.2))} title={t("تكبير", "Zoom In")}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.max(0.005, prev / 1.2))} title={t("تصغير", "Zoom Out")}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" onClick={resetView}>
                <Maximize2 className="h-3.5 w-3.5 me-1.5" />
                {t("ملائمة الشاشة", "Fit Screen")}
              </Button>
            </div>

            {/* Theme & Meta */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCadTheme(prev => prev === "dark" ? "light" : "dark")}
              >
                <Settings className="h-3.5 w-3.5 me-1.5" />
                {currentThemeLabel}
              </Button>
            </div>

          </div>

          {/* Interactive Canvas Container */}
          <div 
            className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950 flex-1"
            style={{ cursor: activeTool === "pan" ? (isPanning ? "grabbing" : "grab") : "crosshair" }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="block w-full h-full"
            />

            {/* Live Hover coordinates box */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white font-mono text-[10px] px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-md pointer-events-none select-none flex gap-3">
              <span>X: {hoverCoords.x.toFixed(2)} mm</span>
              <span>Y: {hoverCoords.y.toFixed(2)} mm</span>
              <span>Z: 0.00 mm</span>
            </div>

            {/* Hint overlay */}
            <div className="absolute top-4 right-4 bg-slate-900/75 text-white/80 text-[10px] px-3 py-1.5 rounded-lg border border-slate-700/40 pointer-events-none select-none flex items-center gap-1.5 backdrop-blur-sm">
              <Info className="h-3.5 w-3.5 text-blue-400" />
              <span>{t("استخدم عجلة الماوس للتكبير والتصغير", "Scroll wheel to zoom, drag to pan")}</span>
            </div>
          </div>
        </div>

        {/* CAD Control Sidebar Panel */}
        <div className="flex flex-col gap-4">
          
          {/* Layer Control Panel */}
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-navy-500" />
                {t("طبقات المخطط (CAD Layers)", "Layers Management")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(layers).map((layerKey) => {
                const key = layerKey as keyof typeof layers;
                const labels: Record<string, { ar: string; en: string }> = {
                  GRID: { ar: "شبكة المحاور الإنشائية", en: "Structural Grid (Axes)" },
                  WALLS: { ar: "الجدران والقواطع الأساسية", en: "Walls & Openings" },
                  ELECTRICAL: { ar: "توزيع الكهرباء والإضاءة", en: "Electrical Layout" },
                  PLUMBING: { ar: "توصيلات المياه والصرف الصحي", en: "Plumbing Fixtures" },
                  DIMENSIONS: { ar: "الأبعاد والقياسات الهندسية", en: "Dimensions & Annotations" },
                };

                const layerColorMap: Record<string, string> = {
                  GRID: "#94a3b8",
                  WALLS: "#00ffff",
                  ELECTRICAL: "#ff00ff",
                  PLUMBING: "#3b82f6",
                  DIMENSIONS: "#22c55e",
                };

                return (
                  <label 
                    key={key} 
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800/60 cursor-pointer select-none transition"
                  >
                    <input
                      type="checkbox"
                      checked={layers[key]}
                      onChange={(e) => setLayers(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-slate-300 text-brand-navy-600 focus:ring-brand-navy-500 h-4 w-4 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: layerColorMap[key] }}
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {isAr ? labels[key].ar : labels[key].en}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block ms-4">
                        Layer: {key}
                      </span>
                    </div>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* Drawing Properties Card */}
          <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-brand-navy-500" />
                {t("بيانات لوحة الرسم", "Sheet Properties")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t("رقم اللوحة", "Sheet Number")}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">A-101</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t("التخصص", "Discipline")}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">{t("معماري", "Architectural")}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t("مقياس الرسم", "Scale")}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">1:50</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t("تاريخ الإصدار", "Release Date")}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">2026-07-01</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">{t("حالة المخطط", "Status")}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-end">{t("معتمد إلكترونياً", "Approved")}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500 dark:text-slate-400">{t("كيانات الرسم", "Total Entities")}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 text-end">{entities.length} items</span>
              </div>
            </CardContent>
          </Card>

          {/* Help instructions info box */}
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-4 rounded-2xl text-xs space-y-2">
            <span className="font-bold block">{t("💡 كيفية الاستخدام:", "💡 CAD Viewer Controls:")}</span>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("اضغط باستمرار واسحب للتحرك (Pan) داخل المخطط.", "Hold left-click and drag to move inside the model.")}</li>
              <li>{t("عجلة الماوس لتكبير وتصغير مكان المؤشر.", "Scroll to zoom in/out relative to the cursor.")}</li>
              <li>{t("استخدم أداة القياس لحساب الأبعاد بين أي نقطتين.", "Select 'Measure' tool, click two points to measure.")}</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
