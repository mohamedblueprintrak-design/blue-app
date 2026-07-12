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
  Plus,
  Type,
  Undo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavStore } from "@/store/nav-store";

interface CADEntity {
  type: "LINE" | "CIRCLE" | "ARC" | "TEXT";
  layer: "GRID" | "WALLS" | "ELECTRICAL" | "PLUMBING" | "DIMENSIONS" | "ANNOTATIONS";
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

// Distance helper functions for interactive hover detection
const getDistanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const nearestX = x1 + clampedT * dx;
  const nearestY = y1 + clampedT * dy;
  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
};

const getDistanceToCircle = (px: number, py: number, cx: number, cy: number, r: number) => {
  const distToCenter = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return Math.abs(distToCenter - r);
};

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
  const t = useCallback((ar: string, en: string) => (isAr ? ar : en), [isAr]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // CAD Navigation State
  const [zoom, setZoom] = useState(0.08); // scale factor
  const [panX, setPanX] = useState(250);  // center offset X
  const [panY, setPanY] = useState(250);  // center offset Y
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Tool Selection
  const [activeTool, setActiveTool] = useState<"pan" | "measure" | "draw_line" | "draw_text">("pan");
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);

  // Custom annotations
  const [tempStartPoint, setTempStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [userAddedCount, setUserAddedCount] = useState(0);

  // Layers Toggles
  const [layers, setLayers] = useState({
    GRID: true,
    WALLS: true,
    ELECTRICAL: true,
    PLUMBING: true,
    DIMENSIONS: true,
    ANNOTATIONS: true,
  });

  // CAD Theme: black (classic neon AutoCAD) vs white (blueprint style)
  const [cadTheme, setCadTheme] = useState<"dark" | "light">("dark");

  // Hover Snapped Coordinates & Snap Details
  const [hoverCoords, setHoverCoords] = useState({ x: 0, y: 0 });
  const [snapInfo, setSnapInfo] = useState<{ x: number; y: number; type: string } | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{ index: number; label: string } | null>(null);

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
    setTempStartPoint(null);
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

  // Object Snapping (OSNAP) Endpoint snap finder
  const getSnappedCoords = useCallback((mouseX: number, mouseY: number): { x: number; y: number; snapPoint: { x: number; y: number; type: string } | null } => {
    const cadX = (mouseX - panX) / zoom;
    const cadY = -(mouseY - panY) / zoom;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let closestPoint: any = null;
    let minScreenDist = 16; // Snap tolerance in pixels
    
    entities.forEach(entity => {
      if (!layers[entity.layer]) return;
      
      const pointsToCheck: { x: number; y: number; type: string }[] = [];
      if (entity.type === "LINE" && entity.x1 !== undefined && entity.y1 !== undefined && entity.x2 !== undefined && entity.y2 !== undefined) {
        pointsToCheck.push({ x: entity.x1, y: entity.y1, type: t("نهاية خط", "Endpoint") });
        pointsToCheck.push({ x: entity.x2, y: entity.y2, type: t("نهاية خط", "Endpoint") });
      } else if ((entity.type === "CIRCLE" || entity.type === "ARC") && entity.cx !== undefined && entity.cy !== undefined) {
        pointsToCheck.push({ x: entity.cx, y: entity.cy, type: t("مركز", "Center") });
      }
      
      pointsToCheck.forEach(pt => {
        const sx = panX + pt.x * zoom;
        const sy = panY - pt.y * zoom;
        const dist = Math.sqrt((mouseX - sx) ** 2 + (mouseY - sy) ** 2);
        if (dist < minScreenDist) {
          minScreenDist = dist;
          closestPoint = pt;
        }
      });
    });
    
    if (closestPoint) {
      return { x: closestPoint.x, y: closestPoint.y, snapPoint: closestPoint };
    }
    return { x: Math.round(cadX), y: Math.round(cadY), snapPoint: null };
  }, [entities, layers, panX, panY, zoom, t]);

  // Find closest entity to mouse cursor for highlighting
  const getHoveredEntity = useCallback((mouseX: number, mouseY: number): { index: number; label: string } | null => {
    const cadX = (mouseX - panX) / zoom;
    const cadY = -(mouseY - panY) / zoom;
    
    let closestIndex = -1;
    let minScreenDist = 12; // Hover tolerance in pixels
    let closestLabel = "";
    
    entities.forEach((entity, index) => {
      if (!layers[entity.layer]) return;
      
      let cadDist = Infinity;
      let label = "";
      
      if (entity.type === "LINE" && entity.x1 !== undefined && entity.y1 !== undefined && entity.x2 !== undefined && entity.y2 !== undefined) {
        cadDist = getDistanceToLine(cadX, cadY, entity.x1, entity.y1, entity.x2, entity.y2);
        
        if (entity.layer === "WALLS") {
          const len = Math.round(Math.sqrt((entity.x2 - entity.x1) ** 2 + (entity.y2 - entity.y1) ** 2));
          label = t(`جدار إنشائي (${(len/1000).toFixed(2)} م)`, `Structural Wall (${(len/1000).toFixed(2)} m)`);
        } else if (entity.layer === "GRID") {
          label = t("خط المحور الإنشائي", "Structural Grid Axis");
        } else if (entity.layer === "DIMENSIONS") {
          label = t("خط أبعاد هندسي", "Dimension Helper Line");
        } else if (entity.layer === "ANNOTATIONS") {
          label = t("خط توضيحي مضاف", "Custom Annotation Line");
        } else if (entity.layer === "PLUMBING") {
          label = t("أنبوب تغذية المياه", "Plumbing Supply Line");
        }
      } else if (entity.type === "CIRCLE" && entity.cx !== undefined && entity.cy !== undefined && entity.r !== undefined) {
        cadDist = getDistanceToCircle(cadX, cadY, entity.cx, entity.cy, entity.r);
        if (entity.layer === "PLUMBING") {
          label = t(`تركيبة صحية (نصف قطر: ${(entity.r/1000).toFixed(2)} م)`, `Plumbing Fixture (Radius: ${(entity.r/1000).toFixed(2)} m)`);
        } else if (entity.layer === "ELECTRICAL") {
          label = t("مخرج إضاءة / كهرباء", "Electrical Outlet Node");
        }
      } else if (entity.type === "ARC" && entity.cx !== undefined && entity.cy !== undefined && entity.r !== undefined) {
        cadDist = getDistanceToCircle(cadX, cadY, entity.cx, entity.cy, entity.r);
        if (entity.layer === "WALLS") {
          label = t("قوس فتحة الباب المفتوح", "Door Swing Arc");
        }
      }
      
      const screenDist = cadDist * zoom;
      if (screenDist < minScreenDist) {
        minScreenDist = screenDist;
        closestIndex = index;
        closestLabel = label;
      }
    });
    
    if (closestIndex !== -1) {
      return { index: closestIndex, label: closestLabel };
    }
    return null;
  }, [entities, layers, panX, panY, zoom, t]);

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
    ctx.strokeStyle = cadTheme === "dark" ? "rgba(71, 85, 105, 0.15)" : "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 0.8;
    const step = 500 * zoom; // Grid lines every 500 mm in CAD space
    if (step > 6) {
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
    entities.forEach((entity, index) => {
      if (!layers[entity.layer]) return;

      const isHovered = hoveredEntity && hoveredEntity.index === index;

      // Color mapping based on theme and hover state
      let strokeColor = entity.color;
      if (isHovered) {
        strokeColor = "#eab308"; // Highlight color: Gold
      } else if (cadTheme === "light") {
        if (entity.color === "#00ffff") strokeColor = "#0f2c5f"; // walls -> navy
        if (entity.color === "#475569") strokeColor = "#cbd5e1"; // grid -> slate-300
        if (entity.color === "#94a3b8") strokeColor = "#64748b"; // labels -> slate-500
      }

      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;
      ctx.lineWidth = entity.layer === "WALLS" ? 2.5 : (isHovered ? 2.0 : 1.2);

      if (isHovered) {
        ctx.shadowColor = "#eab308";
        ctx.shadowBlur = 10;
      }

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

      if (isHovered) {
        ctx.shadowBlur = 0; // Reset shadow glow
      }
    });

    // Draw full-canvas crosshair reticle cursor
    if (hoverCoords) {
      const cx = panX + hoverCoords.x * zoom;
      const cy = panY - hoverCoords.y * zoom;

      ctx.strokeStyle = cadTheme === "dark" ? "rgba(148, 163, 184, 0.2)" : "rgba(71, 85, 105, 0.2)";
      ctx.lineWidth = 0.8;
      
      // Horizontal crosshair line
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvas.width, cy);
      ctx.stroke();

      // Vertical crosshair line
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvas.height);
      ctx.stroke();
    }

    // Draw Snapping marker (green OSNAP box)
    if (snapInfo) {
      const sx = panX + snapInfo.x * zoom;
      const sy = panY - snapInfo.y * zoom;

      ctx.strokeStyle = "#22c55e"; // Emerald green
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(sx - 6, sy - 6, 12, 12);
      ctx.stroke();

      // Draw snapping text label
      ctx.fillStyle = "#22c55e";
      ctx.font = "9px monospace";
      ctx.fillText(snapInfo.type, sx + 10, sy - 8);
    }

    // Draw active measurements
    if (measurePoints.length > 0) {
      ctx.strokeStyle = "#f43f5e"; // Rose-500
      ctx.fillStyle = "#f43f5e";
      ctx.lineWidth = 1.8;

      // Draw first point
      const p1 = measurePoints[0];
      const screenP1X = panX + p1.x * zoom;
      const screenP1Y = panY - p1.y * zoom;
      ctx.beginPath();
      ctx.arc(screenP1X, screenP1Y, 4.5, 0, 2 * Math.PI);
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
        ctx.arc(screenP2X, screenP2Y, 4.5, 0, 2 * Math.PI);
        ctx.fill();

        // Draw distance tag
        if (measureDistance !== null) {
          const midX = (screenP1X + screenP2X) / 2;
          const midY = (screenP1Y + screenP2Y) / 2 - 14;
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          
          const label = `${(measureDistance / 1000).toFixed(2)} m (${measureDistance} mm)`;
          const textWidth = ctx.measureText(label).width;

          // Label background
          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(midX - textWidth / 2 - 5, midY - 10, textWidth + 10, 18);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, midX, midY + 3);
        }
      } else if (activeTool === "measure") {
        // Draw dashed line from point A to snapped cursor
        const hoverPX = panX + hoverCoords.x * zoom;
        const hoverPY = panY - hoverCoords.y * zoom;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(screenP1X, screenP1Y);
        ctx.lineTo(hoverPX, hoverPY);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash
      }
    }

    // Draw Line annotation preview
    if (activeTool === "draw_line" && tempStartPoint) {
      const sx = panX + tempStartPoint.x * zoom;
      const sy = panY - tempStartPoint.y * zoom;
      const ex = panX + hoverCoords.x * zoom;
      const ey = panY - hoverCoords.y * zoom;

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [entities, zoom, panX, panY, layers, cadTheme, measurePoints, measureDistance, hoverCoords, activeTool, snapInfo, hoveredEntity, tempStartPoint]);

  // Mouse Interactions handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Snapped coordinate selection
    const snapped = getSnappedCoords(mouseX, mouseY);

    if (activeTool === "pan") {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    } else if (activeTool === "measure") {
      if (measurePoints.length >= 2) {
        setMeasurePoints([{ x: snapped.x, y: snapped.y }]);
        setMeasureDistance(null);
      } else {
        const newPoints = [...measurePoints, { x: snapped.x, y: snapped.y }];
        setMeasurePoints(newPoints);
        if (newPoints.length === 2) {
          const dx = newPoints[1].x - newPoints[0].x;
          const dy = newPoints[1].y - newPoints[0].y;
          const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
          setMeasureDistance(dist);
        }
      }
    } else if (activeTool === "draw_line") {
      if (!tempStartPoint) {
        setTempStartPoint({ x: snapped.x, y: snapped.y });
      } else {
        // Create custom line entity
        const newEntity: CADEntity = {
          type: "LINE",
          layer: "ANNOTATIONS",
          color: "#ef4444",
          x1: tempStartPoint.x,
          y1: tempStartPoint.y,
          x2: snapped.x,
          y2: snapped.y
        };
        setEntities(prev => [...prev, newEntity]);
        setUserAddedCount(prev => prev + 1);
        setTempStartPoint(null);
      }
    } else if (activeTool === "draw_text") {
      const text = window.prompt(t("أدخل نص الملاحظة الهندسية للرسم:", "Enter custom annotation note label:"));
      if (text && text.trim()) {
        const newEntity: CADEntity = {
          type: "TEXT",
          layer: "ANNOTATIONS",
          color: "#ef4444",
          text: text.trim(),
          fontSize: 140,
          x: snapped.x,
          y: snapped.y
        };
        setEntities(prev => [...prev, newEntity]);
        setUserAddedCount(prev => prev + 1);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const snapped = getSnappedCoords(mouseX, mouseY);
    setHoverCoords({ x: snapped.x, y: snapped.y });
    setSnapInfo(snapped.snapPoint);

    // Entity hovering check
    if (!isPanning && activeTool === "pan") {
      const hovered = getHoveredEntity(mouseX, mouseY);
      setHoveredEntity(hovered);
    } else {
      setHoveredEntity(null);
    }

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
    const zoomFactor = 1.15;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    
    if (nextZoom < 0.005 || nextZoom > 2.0) return;

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
    setTempStartPoint(null);

    const reader = new FileReader();
    reader.onload = () => {
      const newEntities = [...SAMPLE_ENTITIES];
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

  const undoLastAnnotation = () => {
    if (userAddedCount > 0) {
      setEntities(prev => prev.slice(0, -1));
      setUserAddedCount(prev => prev - 1);
      setMeasurePoints([]);
      setMeasureDistance(null);
      setTempStartPoint(null);
    }
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
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={activeTool === "pan" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveTool("pan");
                  setMeasurePoints([]);
                  setMeasureDistance(null);
                  setTempStartPoint(null);
                }}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <MousePointer className="h-3.5 w-3.5" />
                {t("التنقل والتحديد", "Pan / Select")}
              </Button>

              <Button
                variant={activeTool === "measure" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveTool("measure");
                  setTempStartPoint(null);
                }}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <Ruler className="h-3.5 w-3.5" />
                {t("أداة القياس", "Measure")}
              </Button>

              <Button
                variant={activeTool === "draw_line" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveTool("draw_line");
                  setMeasurePoints([]);
                  setMeasureDistance(null);
                  setTempStartPoint(null);
                }}
                className="h-8 px-3 text-xs gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 border-red-200/50 dark:border-red-900/30"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("رسم خط ملاحظة", "Draw Line Note")}
              </Button>

              <Button
                variant={activeTool === "draw_text" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveTool("draw_text");
                  setMeasurePoints([]);
                  setMeasureDistance(null);
                  setTempStartPoint(null);
                }}
                className="h-8 px-3 text-xs gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 border-red-200/50 dark:border-red-900/30"
              >
                <Type className="h-3.5 w-3.5" />
                {t("إضافة ملاحظة نصية", "Add Text Note")}
              </Button>

              {userAddedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoLastAnnotation}
                  className="h-8 px-2.5 text-xs gap-1.5"
                >
                  <Undo className="h-3.5 w-3.5" />
                  {t("تراجع", "Undo")}
                </Button>
              )}
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

            {/* Theme Toggle */}
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
            className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950 flex-1 min-h-[500px]"
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

            {/* Entity Hover Tooltip */}
            {hoveredEntity && (
              <div 
                className="absolute bg-slate-900/90 dark:bg-slate-950/95 border border-amber-500/30 text-white rounded-lg px-2.5 py-1.5 text-[10px] shadow-lg pointer-events-none select-none backdrop-blur-sm z-10 flex items-center gap-1.5"
                style={{
                  top: `${panY - hoverCoords.y * zoom - 36}px`,
                  left: `${panX + hoverCoords.x * zoom + 16}px`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="font-semibold whitespace-nowrap">{hoveredEntity.label}</span>
              </div>
            )}

            {/* Live Coordinates box */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white font-mono text-[10px] px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-md pointer-events-none select-none flex gap-3">
              <span>X: {hoverCoords.x.toFixed(2)} mm</span>
              <span>Y: {hoverCoords.y.toFixed(2)} mm</span>
              <span>Z: 0.00 mm</span>
              {snapInfo && <span className="text-emerald-400 font-bold">● SNAP: {snapInfo.type}</span>}
            </div>

            {/* Hint overlay */}
            <div className="absolute top-4 right-4 bg-slate-900/75 text-white/80 text-[10px] px-3 py-1.5 rounded-lg border border-slate-700/40 pointer-events-none select-none flex items-center gap-1.5 backdrop-blur-sm">
              <Info className="h-3.5 w-3.5 text-blue-400" />
              <span>{t("اسحب للتحريك، عجلة الماوس للزوم، المس لنقاط الالتقاط", "Drag to pan, wheel to zoom, hover to snap endpoints")}</span>
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
                  ANNOTATIONS: { ar: "ملاحظات المستخدم المضافة", en: "User Custom Annotations" },
                };

                const layerColorMap: Record<string, string> = {
                  GRID: "#94a3b8",
                  WALLS: "#00ffff",
                  ELECTRICAL: "#ff00ff",
                  PLUMBING: "#3b82f6",
                  DIMENSIONS: "#22c55e",
                  ANNOTATIONS: "#ef4444",
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
              <li>{t("استخدم أداة القياس لحساب الأبعاد الدقيقة بفضل نقاط الالتقاط.", "Use 'Measure' tool; vertices snap automatically.")}</li>
              <li>{t("استخدم أدوات الرسم الحمراء لإضافة ملاحظات وخطوط توضيحية.", "Use drawing tools to add custom annotations to the sheet.")}</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
