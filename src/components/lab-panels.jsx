"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownToLine, Check, Radio, TriangleAlert } from "lucide-react";

export function formatTime(milliseconds) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return seconds < 60 ? `${seconds.toFixed(2)}s` : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

const chartMetrics = [
  { id: "throughput", label: "Throughput", unit: "Mbps", color: "#b8ef58" },
  { id: "latency", label: "Mean delay", unit: "ms", color: "#66dcf5" },
  { id: "inFlight", label: "In flight", unit: "pkts", color: "#f5ae65" },
];

export function TelemetryChart({ series }) {
  const [metricId, setMetricId] = useState("throughput");
  const metric = chartMetrics.find((item) => item.id === metricId);
  const width = 480;
  const height = 150;
  const padding = 10;
  const values = series.map((point) => Number(point[metricId]) || 0);
  const maximum = Math.max(1, ...values) * 1.12;
  const latest = values.at(-1) ?? 0;
  const path = useMemo(() => {
    if (!series.length) return "";
    return series
      .map((point, index) => {
        const x = series.length === 1 ? width / 2 : padding + (index / (series.length - 1)) * (width - padding * 2);
        const y = height - padding - ((Number(point[metricId]) || 0) / maximum) * (height - padding * 2);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [series, metricId, maximum]);
  const area = path ? `${path} L${width - padding},${height - padding} L${padding},${height - padding} Z` : "";

  return (
    <div className="telemetry-chart">
      <div className="chart-heading">
        <div className="chart-tabs" aria-label="Chart metric">
          {chartMetrics.map((item) => (
            <button key={item.id} className={metricId === item.id ? "active" : ""} onClick={() => setMetricId(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="chart-reading" style={{ color: metric.color }}>
          {latest.toFixed(metricId === "inFlight" ? 0 : 2)} <small>{metric.unit}</small>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label={`${metric.label} over simulation time`}>
        {[0.25, 0.5, 0.75].map((position) => (
          <line key={position} className="chart-grid-line" x1="0" x2={width} y1={height * position} y2={height * position} />
        ))}
        {area && <path d={area} fill={metric.color} opacity="0.07" />}
        {path && <path d={path} fill="none" stroke={metric.color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />}
        {series.length > 0 && (
          <circle
            cx={series.length === 1 ? width / 2 : width - padding}
            cy={height - padding - (latest / maximum) * (height - padding * 2)}
            r="4"
            fill={metric.color}
          />
        )}
      </svg>
      <div className="chart-axis"><span>0s</span><span>{formatTime(series.at(-1)?.time ?? 0)}</span></div>
    </div>
  );
}

const eventIcons = {
  delivered: Check,
  error: TriangleAlert,
  loss: TriangleAlert,
  retry: Radio,
  send: ArrowDownToLine,
  route: Activity,
  system: Activity,
};

export function EventStream({ events, onSelectPacket }) {
  const visible = [...events].reverse().slice(0, 55);
  return (
    <div className="event-stream" aria-live="polite">
      {visible.map((event) => {
        const Icon = eventIcons[event.type] ?? Activity;
        return (
          <button
            className={`event-row event-${event.type}`}
            key={event.id}
            onClick={() => event.packetId && onSelectPacket(event.packetId)}
            disabled={!event.packetId}
          >
            <span className="event-time">{formatTime(event.time)}</span>
            <span className="event-icon"><Icon size={13} strokeWidth={1.8} /></span>
            <span className="event-message">{event.message}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PacketLedger({ packets, selectedPacket, onSelectPacket }) {
  return (
    <div className="table-scroll">
      <table className="packet-table">
        <thead><tr><th>Seq</th><th>State</th><th>Current node</th><th>Attempts</th><th>TTL</th><th>Latency</th></tr></thead>
        <tbody>
          {[...packets].reverse().map((packet) => (
            <tr key={packet.id} className={selectedPacket === packet.id ? "selected" : ""}>
              <td>
                <button className="packet-select" onClick={() => onSelectPacket(packet.id)}>#{String(packet.sequence).padStart(2, "0")}</button>
              </td>
              <td><span className={`packet-status status-${packet.status}`}>{packet.status}</span></td>
              <td>{packet.currentNode}</td>
              <td>{packet.attempts}</td>
              <td>{packet.remainingTtl}</td>
              <td>{packet.latency === null ? "—" : `${packet.latency.toFixed(1)} ms`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkHealth({ links, selectedLink, onSelectLink }) {
  return (
    <div className="link-health-list">
      <div className="link-health-head"><span>Interface</span><span>Queue</span><span>Utilization</span></div>
      {links.map((link) => (
        <button key={link.id} className={`link-health-row ${selectedLink === link.id ? "selected" : ""}`} onClick={() => onSelectLink(link.id)}>
          <span className="link-health-name"><i className={link.failed ? "down" : ""} />{link.id}</span>
          <span>{link.queued}</span>
          <span className="utilization-cell">
            <span className="utilization-track"><i style={{ width: `${link.utilization}%` }} /></span>
            <b>{Math.round(link.utilization)}%</b>
          </span>
        </button>
      ))}
    </div>
  );
}
