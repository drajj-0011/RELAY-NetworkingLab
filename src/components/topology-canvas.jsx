"use client";

import { memo } from "react";

const WIDTH = 1000;
const HEIGHT = 560;
const point = (node) => ({ x: node.x * 10, y: 30 + node.y * 5 });

function edgeKey(a, b) {
  return [a, b].sort().join("|");
}

function TopologyCanvas({
  topology,
  snapshot,
  selectedNode,
  selectedLink,
  selectedPacket,
  onNodeClick,
  onLinkClick,
  onClearSelection,
}) {
  const nodes = new Map(topology.nodes.map((node) => [node.id, node]));
  const highlightedPacket = snapshot.packets.find((packet) => packet.id === selectedPacket);
  const route = highlightedPacket?.route?.length ? highlightedPacket.route : snapshot.routePreview;
  const routeEdges = new Set(route.slice(1).map((node, index) => edgeKey(route[index], node)));
  const visitedEdges = new Set(
    (highlightedPacket?.visited ?? []).slice(1).map((node, index) => edgeKey(highlightedPacket.visited[index], node)),
  );

  return (
    <svg
      className="topology-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="group"
      aria-label={`${topology.name} live packet simulation`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClearSelection();
      }}
    >
      <defs>
        <pattern id="lab-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.12" />
        </pattern>
        <filter id="packet-glow" x="-200%" y="-200%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width={WIDTH} height={HEIGHT} className="topology-grid" fill="url(#lab-grid)" onClick={onClearSelection} />

      <g className="topology-links">
        {snapshot.links.map((link) => {
          const a = point(nodes.get(link.a));
          const b = point(nodes.get(link.b));
          const onRoute = routeEdges.has(edgeKey(link.a, link.b));
          const visited = visitedEdges.has(edgeKey(link.a, link.b));
          const selected = selectedLink === link.id;
          return (
            <g
              key={link.id}
              className={`topology-link ${link.failed ? "is-failed" : ""} ${onRoute ? "is-route" : ""} ${visited ? "is-visited" : ""} ${selected ? "is-selected" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onLinkClick(link.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onLinkClick(link.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${link.id}, ${link.bandwidth} megabits per second, ${link.latency} milliseconds${link.failed ? ", failed" : ""}`}
            >
              <title>{`${link.id} · ${link.bandwidth} Mbps · ${link.latency} ms · ${link.queued} queued · click to ${link.failed ? "restore" : "disable"}`}</title>
              <line className="link-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              <line
                className="link-visible"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                style={{ "--load": `${Math.round(link.utilization)}%` }}
              />
              {link.active && !link.failed && <line className="link-active" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />}
              {selected && (
                <text className="link-selection-label" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 10} textAnchor="middle">
                  {link.failed ? "LINK DOWN" : `${link.queued} QUEUED · ${Math.round(link.utilization)}% BUSY`}
                </text>
              )}
            </g>
          );
        })}
      </g>

      <g className="topology-effects" pointerEvents="none">
        {snapshot.effects.map((effect) => {
          let position = null;
          if (effect.nodeId && nodes.has(effect.nodeId)) position = point(nodes.get(effect.nodeId));
          if (effect.linkId) {
            const link = topology.links.find((item) => item.id === effect.linkId);
            if (link) {
              const a = point(nodes.get(link.a));
              const b = point(nodes.get(link.b));
              position = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            }
          }
          if (!position) return null;
          return <circle key={effect.id} className={`effect-ring effect-${effect.type}`} cx={position.x} cy={position.y} r="18" />;
        })}
      </g>

      <g className="topology-nodes">
        {topology.nodes.map((node) => {
          const p = point(node);
          const isSource = snapshot.config.source === node.id;
          const isDestination = snapshot.config.destination === node.id;
          const selected = selectedNode === node.id;
          const queue = snapshot.queueByNode[node.id] ?? 0;
          return (
            <g
              key={node.id}
              transform={`translate(${p.x} ${p.y})`}
              className={`topology-node node-${node.role} ${selected ? "is-selected" : ""} ${isSource ? "is-source" : ""} ${isDestination ? "is-destination" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onNodeClick(node, event);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onNodeClick(node, event);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}, ${node.role}, ${node.address}${isSource ? ", source" : ""}${isDestination ? ", destination" : ""}`}
            >
              <title>{`${node.label} · ${node.address} · ${node.detail}${node.role === "router" ? " · click to inspect" : " · click for source, shift-click for destination"}`}</title>
              <circle className="node-hit" r="36" />
              {(isSource || isDestination || selected) && <circle className="node-orbit" r="32" />}
              {node.role === "router" ? (
                <rect className="node-shape" x="-21" y="-21" width="42" height="42" rx="8" />
              ) : (
                <circle className="node-shape" r={node.role === "server" ? 24 : 21} />
              )}
              {node.role === "router" && (
                <g className="router-glyph">
                  <path d="M-10 -5 H10 M5 -10 L10 -5 5 0 M10 7 H-10 M-5 2 L-10 7 -5 12" />
                </g>
              )}
              {node.role === "server" && <path className="server-glyph" d="M-10 -8 H10 M-10 0 H10 M-10 8 H10" />}
              {node.role === "host" && <circle className="host-dot" r="4" />}
              <text className="node-label" y="45" textAnchor="middle">{node.label}</text>
              <text className="node-address" y="59" textAnchor="middle">{node.address}</text>
              {isSource && <text className="endpoint-badge source-badge" x="28" y="-25">SRC</text>}
              {isDestination && <text className="endpoint-badge destination-badge" x="28" y="-25">DST</text>}
              {queue > 0 && (
                <g className={`queue-badge ${queue >= snapshot.config.queueLimit ? "is-full" : ""}`} transform="translate(-34 -30)">
                  <rect x="-12" y="-10" width="28" height="20" rx="10" />
                  <text textAnchor="middle" y="4">{queue}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      <g className="active-packets" pointerEvents="none">
        {snapshot.activeTransfers.map((transfer) => {
          const from = point(nodes.get(transfer.from));
          const to = point(nodes.get(transfer.to));
          const progress = transfer.progress;
          const x = from.x + (to.x - from.x) * progress;
          const y = from.y + (to.y - from.y) * progress;
          return (
            <g key={`${transfer.packetId}-${transfer.from}`} transform={`translate(${x} ${y})`} className={`packet-marker packet-${transfer.protocol}`}>
              <circle className="packet-halo" r="13" />
              <circle className="packet-core" r="7" filter="url(#packet-glow)" />
              <text y="-13" textAnchor="middle">{transfer.sequence}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default memo(TopologyCanvas);
