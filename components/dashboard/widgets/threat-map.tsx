"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAlerts, useAssets } from "@/lib/hooks/use-data";

interface ThreatNode {
  id: string;
  name: string;
  status: "normal" | "warning" | "critical" | "offline";
  x: number;
  y: number;
  angle: number;
}

function toNodeStatus(status?: string): ThreatNode["status"] {
  if (status === "offline") return "offline";
  if (status === "warning") return "warning";
  return "normal";
}

function getStatusStyles(status: ThreatNode["status"]) {
  switch (status) {
    case "critical":
      return {
        dot: "fill-red-500",
        glow: "filter-red",
        ring: "stroke-red-500/50",
        pulse: "fill-red-500/40"
      };
    case "warning":
      return {
        dot: "fill-yellow-500",
        glow: "filter-yellow",
        ring: "stroke-yellow-500/50",
        pulse: "fill-yellow-500/40"
      };
    case "offline":
      return {
        dot: "fill-muted-foreground",
        glow: "",
        ring: "stroke-muted-foreground/30",
        pulse: ""
      };
    default:
      return {
        dot: "fill-green-500",
        glow: "filter-green",
        ring: "stroke-green-500/30",
        pulse: ""
      };
  }
}

export function ThreatMap() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { assets } = useAssets({ limit: 40 });
  const { alerts } = useAlerts({ status: "new", limit: 200 });

  const criticalAssetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const alert of alerts as any[]) {
      if (!alert.asset_id) continue;
      if (alert.status === "resolved") continue;
      if (alert.severity === "critical") ids.add(alert.asset_id);
    }
    return ids;
  }, [alerts]);

  const nodes = useMemo(() => {
    const list = (assets as any[]).slice(0, 14);
    const centerX = 50;
    const centerY = 50;
    const radius = 35;

    return list.map((asset, index) => {
      const angle = (index / list.length) * 2 * Math.PI - Math.PI / 2;
      const status = criticalAssetIds.has(asset.id) ? "critical" : toNodeStatus(asset.status);
      
      return {
        id: asset.id,
        name: asset.name,
        status,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        angle
      } satisfies ThreatNode;
    });
  }, [assets, criticalAssetIds]);

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl border border-muted/40 bg-card/40 backdrop-blur-md">
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <pattern id="hexagons" width="8" height="14" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
            <path d="M4 0 L8 2 L8 7 L4 9 L0 7 L0 2 Z" fill="none" stroke="currentColor" strokeWidth="0.05" className="text-primary/10" />
          </pattern>
        </defs>

        <rect width="100" height="100" fill="url(#hexagons)" className="opacity-40" />
        
        {/* Animated Radial Rings */}
        <circle cx="50" cy="50" r="35" className="stroke-primary/5 fill-none" strokeWidth="0.2" />
        <circle cx="50" cy="50" r="20" className="stroke-primary/5 fill-none" strokeWidth="0.2" />
        <circle cx="50" cy="50" r="5" className="fill-primary/10 animate-pulse" />

        {/* Central Hub */}
        <g className="opacity-80">
          <circle cx="50" cy="50" r="2" className="fill-primary" filter="url(#glow-green)" />
          <text x="50" y="55" className="fill-primary text-[2px] font-bold" textAnchor="middle uppercase tracking-tighter">ShieldCore</text>
        </g>

        {/* Connection Lines with Data Flow */}
        {nodes.map((node) => (
          <g key={`link-${node.id}`}>
            <line
              x1="50"
              y1="50"
              x2={node.x}
              y2={node.y}
              className={cn(
                "stroke-muted-foreground/10",
                node.status === "critical" && "stroke-red-500/20"
              )}
              strokeWidth="0.15"
            />
            {node.status === "normal" && (
              <circle r="0.4" className="fill-green-400">
                <animateMotion
                  dur={`${2 + Math.random() * 2}s`}
                  repeatCount="indefinite"
                  path={`M 50 50 L ${node.x} ${node.y}`}
                />
              </circle>
            )}
          </g>
        ))}

        {/* Nodes */}
        {nodes.map((node) => {
          const styles = getStatusStyles(node.status);
          const labelDist = 6;
          const lx = node.x + Math.cos(node.angle) * labelDist;
          const ly = node.y + Math.sin(node.angle) * labelDist;
          
          return (
            <g
              key={node.id}
              className="cursor-pointer group"
              onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
            >
              {/* Pulse / Beacon */}
              {(node.status === "critical" || node.status === "warning") && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="3.5"
                  className={cn("animate-ping opacity-75", styles.pulse)}
                />
              )}

              {/* Node Outer Ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r="3"
                className={cn("fill-none stroke-[0.3]", styles.ring)}
              />

              {/* Node Core */}
              <circle
                cx={node.x}
                cy={node.y}
                r="1.8"
                className={cn(styles.dot, selectedNode === node.id && "stroke-[0.8] stroke-white")}
                filter={node.status === 'critical' ? 'url(#glow-red)' : 'url(#glow-green)'}
              />

              {/* Smart Labels */}
              <g className={cn("transition-opacity duration-300", selectedNode === node.id ? "opacity-100" : "opacity-70 xl:opacity-40 group-hover:opacity-100")}>
                <text
                  x={lx}
                  y={ly}
                  className={cn(
                    "text-[2px] font-medium tracking-wide",
                    node.status === "critical" ? "fill-red-400 font-bold" : "fill-foreground"
                  )}
                  textAnchor={Math.cos(node.angle) > 0 ? "start" : "end"}
                  dominantBaseline="middle"
                >
                  {node.name.toUpperCase()}
                </text>
                {selectedNode === node.id && (
                  <text
                    x={lx}
                    y={ly + 2}
                    className="fill-muted-foreground text-[1.5px]"
                    textAnchor={Math.cos(node.angle) > 0 ? "start" : "end"}
                  >
                    STATUS: {node.status.toUpperCase()}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {/* Legend / Status HUD */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 rounded-lg border border-white/5 bg-black/40 p-3 backdrop-blur-md transition-all hover:bg-black/60">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Network Integrity: High</span>
        </div>
        <div className="h-[1px] w-full bg-white/5" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          <span className="text-muted-foreground">Assets:</span>
          <span className="font-mono text-right">{nodes.length}</span>
          <span className="text-muted-foreground">Critical:</span>
          <span className="font-mono text-right text-red-500">{nodes.filter(n => n.status === 'critical').length}</span>
          <span className="text-muted-foreground">Warning:</span>
          <span className="font-mono text-right text-yellow-500">{nodes.filter(n => n.status === 'warning').length}</span>
        </div>
      </div>

      {/* Interactive Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] text-muted-foreground pointer-events-none opacity-50">
        <Activity className="h-3 w-3" />
        Interactive Node Topology Map
      </div>
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

