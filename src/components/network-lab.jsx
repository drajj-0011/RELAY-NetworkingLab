"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  Braces,
  Check,
  ChevronDown,
  CircleStop,
  Download,
  FileSpreadsheet,
  FlaskConical,
  FolderOpen,
  GitCompareArrows,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Save,
  Share2,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import TopologyCanvas from "./topology-canvas";
import { EventStream, LinkHealth, PacketLedger, TelemetryChart, formatTime } from "./lab-panels";
import {
  ROUTING_MODES,
  TOPOLOGIES,
  createScenarioConfig,
  getEndpoints,
  getTopology,
  sanitizeConfig,
} from "@/lib/network-data";
import { NetworkSimulation } from "@/lib/simulator";
import { apiFetch, isUsingExpressBackend } from "@/lib/api";

const STRUCTURAL_CONTROLS = new Set([
  "topologyId", "source", "destination", "protocol", "packetCount", "packetSize", "spacing", "ttl", "seed", "window", "maxAttempts",
]);

function downloadBlob(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Modal({ title, eyebrow, onClose, children, wide = false }) {
  useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section
        className={`modal-card ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </header>
        {children}
      </motion.section>
    </motion.div>
  );
}

function RangeControl({ label, value, display, min, max, step = 1, onChange, hint }) {
  return (
    <label className="range-control">
      <span className="control-label"><span>{label}</span><output>{display}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      {hint && <span className="control-hint">{hint}</span>}
    </label>
  );
}

function MetricCard({ label, value, unit, tone, detail }) {
  return (
    <div className={`metric-card ${tone ? `metric-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}<small>{unit}</small></strong>
      <em>{detail}</em>
    </div>
  );
}

export default function NetworkLab({ initialExperiments = [], databaseError = null, databaseUri = "", backend = "next" }) {
  const reducedMotion = useReducedMotion();
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new NetworkSimulation(createScenarioConfig("campus"));
  const [config, setConfig] = useState(() => ({ ...engineRef.current.config }));
  const [snapshot, setSnapshot] = useState(() => engineRef.current.getSnapshot());
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [activeTab, setActiveTab] = useState("events");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [experiments, setExperiments] = useState(initialExperiments);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [toast, setToast] = useState(null);
  const configRef = useRef(config);
  const playingRef = useRef(isPlaying);
  const toastTimer = useRef(null);
  configRef.current = config;
  playingRef.current = isPlaying;

  const topology = getTopology(config.topologyId);
  const endpoints = getEndpoints(topology);
  const selectedLinkData = snapshot.links.find((link) => link.id === selectedLink);
  const selectedNodeData = topology.nodes.find((node) => node.id === selectedNode);
  const selectedPacketData = snapshot.packets.find((packet) => packet.id === selectedPacket);

  const notify = useCallback((message, tone = "success") => {
    setToast({ message, tone, id: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  const persistWorkspace = useCallback((nextConfig, failedLinks) => {
    try {
      if (window.location.hash.includes("workspace=")) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
      localStorage.setItem("relay-workspace-v1", JSON.stringify({ config: nextConfig, failedLinks }));
    } catch {
      // The simulator remains fully usable when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let restored = null;
    try {
      const shared = new URLSearchParams(window.location.hash.slice(1)).get("workspace");
      if (shared) {
        restored = JSON.parse(atob(decodeURIComponent(shared)));
      } else {
        const local = localStorage.getItem("relay-workspace-v1");
        if (local) restored = JSON.parse(local);
      }
    } catch {
      restored = null;
    }
    if (restored?.config) {
      const next = sanitizeConfig(restored.config);
      const failed = Array.isArray(restored.failedLinks) ? restored.failedLinks : [];
      configRef.current = next;
      setConfig(next);
      engineRef.current.reset(next, failed);
      setSnapshot(engineRef.current.getSnapshot());
    }
    setIsPlaying(!reducedMotion);
    return () => window.clearTimeout(toastTimer.current);
  }, [reducedMotion]);

  useEffect(() => {
    let animationFrame;
    let previous = performance.now();
    let lastRender = 0;
    const loop = (now) => {
      const elapsed = Math.min(100, now - previous);
      previous = now;
      if (playingRef.current && !engineRef.current.isComplete()) {
        engineRef.current.tick(elapsed * configRef.current.speed);
        if (now - lastRender > 65 || engineRef.current.isComplete()) {
          setSnapshot(engineRef.current.getSnapshot());
          lastRender = now;
        }
        if (engineRef.current.isComplete()) setIsPlaying(false);
      }
      animationFrame = requestAnimationFrame(loop);
    };
    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const applyConfig = useCallback((patch, forceReset = false) => {
    const candidate = { ...configRef.current, ...patch };
    if (candidate.source === candidate.destination) {
      const other = getEndpoints(getTopology(candidate.topologyId)).find((node) => node.id !== candidate.source);
      if (patch.source) candidate.destination = other?.id ?? candidate.destination;
      else candidate.source = other?.id ?? candidate.source;
    }
    const next = sanitizeConfig(candidate);
    const shouldReset = forceReset || Object.keys(patch).some((key) => STRUCTURAL_CONTROLS.has(key));
    configRef.current = next;
    setConfig(next);
    if (shouldReset) {
      const failed = patch.topologyId ? [] : [...engineRef.current.failedLinks];
      engineRef.current.reset(next, failed);
      setSelectedPacket(null);
    } else {
      engineRef.current.updateConfig(next);
    }
    setSnapshot(engineRef.current.getSnapshot());
    persistWorkspace(next, [...engineRef.current.failedLinks]);
  }, [persistWorkspace]);

  const loadScenario = useCallback((topologyId, autoplay = true) => {
    const next = createScenarioConfig(topologyId);
    configRef.current = next;
    setConfig(next);
    engineRef.current.reset(next, []);
    setSnapshot(engineRef.current.getSnapshot());
    setSelectedNode(null);
    setSelectedLink(null);
    setSelectedPacket(null);
    setIsPlaying(autoplay && !reducedMotion);
    persistWorkspace(next, []);
  }, [persistWorkspace, reducedMotion]);

  useEffect(() => {
    const handler = (event) => loadScenario(event.detail);
    window.addEventListener("relay:scenario", handler);
    return () => window.removeEventListener("relay:scenario", handler);
  }, [loadScenario]);

  useEffect(() => {
    const handler = (event) => applyConfig({ protocol: event.detail });
    window.addEventListener("relay:protocol", handler);
    return () => window.removeEventListener("relay:protocol", handler);
  }, [applyConfig]);

  const togglePlayback = () => {
    if (engineRef.current.isComplete()) {
      engineRef.current.reset(configRef.current, [...engineRef.current.failedLinks]);
      setSnapshot(engineRef.current.getSnapshot());
      setIsPlaying(true);
    } else {
      setIsPlaying((value) => !value);
      setSnapshot(engineRef.current.getSnapshot());
    }
  };

  const resetSimulation = () => {
    engineRef.current.reset(configRef.current, [...engineRef.current.failedLinks]);
    setSnapshot(engineRef.current.getSnapshot());
    setSelectedPacket(null);
    setIsPlaying(false);
  };

  const stepSimulation = () => {
    setIsPlaying(false);
    engineRef.current.tick(100);
    setSnapshot(engineRef.current.getSnapshot());
  };

  const toggleLink = (linkId) => {
    const shouldFail = !engineRef.current.failedLinks.has(linkId);
    engineRef.current.setLinkFailed(linkId, shouldFail);
    setSelectedLink(linkId);
    setSelectedNode(null);
    setSnapshot(engineRef.current.getSnapshot());
    persistWorkspace(configRef.current, [...engineRef.current.failedLinks]);
    notify(`${linkId} ${shouldFail ? "disabled" : "restored"}`, shouldFail ? "warning" : "success");
  };

  const selectEndpoint = (kind, nodeId) => {
    if (kind === "source" && nodeId === config.destination) {
      applyConfig({ source: nodeId, destination: config.source });
    } else if (kind === "destination" && nodeId === config.source) {
      applyConfig({ destination: nodeId, source: config.destination });
    } else {
      applyConfig({ [kind]: nodeId });
    }
  };

  const handleNodeClick = (node, event) => {
    setSelectedNode(node.id);
    setSelectedLink(null);
    setSelectedPacket(null);
    if (node.role !== "router") selectEndpoint(event.shiftKey ? "destination" : "source", node.id);
  };

  const openSave = () => {
    setSaveName(`${topology.shortName} · ${config.protocol.toUpperCase()} · ${formatTime(snapshot.time)}`);
    setSaveNotes("");
    setSaveOpen(true);
  };

  const saveExperiment = async (event) => {
    event.preventDefault();
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const data = await apiFetch("/api/experiments", {
        method: "POST",
        body: JSON.stringify({
          name: saveName,
          notes: saveNotes,
          config: configRef.current,
          failedLinks: snapshot.failedLinks,
          results: { metrics: snapshot.metrics, elapsed: snapshot.time, packets: snapshot.packets },
        }),
      });
      setExperiments((items) => [data.experiment, ...items]);
      setSaveOpen(false);
      notify("Experiment saved to MongoDB");
    } catch (error) {
      notify(error.message, "warning");
    } finally {
      setSaving(false);
    }
  };

  const deleteExperiment = async (id) => {
    try {
      await apiFetch(`/api/experiments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setExperiments((items) => items.filter((item) => item.id !== id));
      notify("Saved experiment deleted from MongoDB");
    } catch (error) {
      notify(error.message, "warning");
    }
  };

  const loadExperiment = (experiment) => {
    const next = sanitizeConfig(experiment.config);
    const failed = Array.isArray(experiment.failedLinks) ? experiment.failedLinks : [];
    configRef.current = next;
    setConfig(next);
    engineRef.current.reset(next, failed);
    setSnapshot(engineRef.current.getSnapshot());
    setSelectedNode(null);
    setSelectedLink(null);
    setSelectedPacket(null);
    setSavedOpen(false);
    setIsPlaying(!reducedMotion);
    persistWorkspace(next, failed);
    notify(`Loaded “${experiment.name}” as a new run`);
  };

  const exportJson = () => {
    const payload = {
      project: "RELAY Network Systems Lab",
      exportedAt: new Date().toISOString(),
      topology: topology.name,
      config,
      failedLinks: snapshot.failedLinks,
      elapsed: snapshot.time,
      metrics: snapshot.metrics,
      packets: snapshot.packets,
      events: snapshot.events,
    };
    downloadBlob(JSON.stringify(payload, null, 2), "application/json", `relay-${config.topologyId}-${Date.now()}.json`);
    notify("JSON experiment exported");
  };

  const exportCsv = () => {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["sequence", "protocol", "source", "destination", "status", "attempts", "remaining_ttl", "released_ms", "delivered_ms", "latency_ms", "drop_reason"],
      ...snapshot.packets.map((packet) => [
        packet.sequence, packet.protocol, packet.source, packet.destination, packet.status, packet.attempts,
        packet.remainingTtl, packet.releasedAt, packet.deliveredAt, packet.latency, packet.dropReason,
      ]),
    ];
    downloadBlob(rows.map((row) => row.map(escape).join(",")).join("\n"), "text/csv;charset=utf-8", `relay-packets-${Date.now()}.csv`);
    notify("Packet ledger exported as CSV");
  };

  const shareWorkspace = async () => {
    const encoded = encodeURIComponent(btoa(JSON.stringify({ config, failedLinks: snapshot.failedLinks })));
    const url = `${window.location.origin}${window.location.pathname}#workspace=${encoded}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      notify("Share link copied — it contains the full setup");
    } catch {
      notify("Share link is now in the address bar; copy it from there", "warning");
    }
  };

  const compareTransports = async () => {
    setCompareOpen(true);
    setComparing(true);
    setComparison(null);
    try {
      const data = await apiFetch("/api/compare", {
        method: "POST",
        body: JSON.stringify({ config, failedLinks: snapshot.failedLinks }),
      });
      setComparison(data);
    } catch (error) {
      notify(error.message, "warning");
      setCompareOpen(false);
    } finally {
      setComparing(false);
    }
  };

  const routeDescription = ROUTING_MODES.find((mode) => mode.id === config.routing)?.description;
  const status = snapshot.completed ? "COMPLETE" : isPlaying ? "RUNNING" : snapshot.time > 0 ? "PAUSED" : "READY";

  return (
    <section className="lab-section" id="lab">
      <div className="section-heading lab-heading">
        <div><span className="eyebrow dark">01 / LIVE LABORATORY</span><h2>Break the network.<br />Keep the message moving.</h2></div>
        <p>Every marker below is a stateful packet. Change a condition, interrupt a link, or switch transport—then inspect the evidence.</p>
      </div>

      <div className="lab-shell">
        <div className="lab-toolbar">
          <div className="lab-brand"><FlaskConical size={18} /><span>RELAY WORKBENCH</span><i>v1.0</i></div>
          <label className="scenario-select">
            <span>SCENARIO</span>
            <select value={config.topologyId} onChange={(event) => loadScenario(event.target.value)}>
              {TOPOLOGIES.map((item) => <option value={item.id} key={item.id}>{item.index} — {item.name}</option>)}
            </select>
          </label>
          <div className={`run-status status-${status.toLowerCase()}`}><i />{status}<span>{formatTime(snapshot.time)}</span></div>
          <div className="toolbar-actions">
            <button onClick={() => setSavedOpen(true)}><FolderOpen size={15} />Saved <b>{experiments.length}</b></button>
            <button onClick={shareWorkspace}><Share2 size={15} />Share</button>
            <button className="toolbar-primary" onClick={openSave}><Save size={15} />Save run</button>
          </div>
        </div>

        <div className={`db-strip ${databaseError ? "db-down" : "db-up"}`}>
          <span className="db-dot" />
          <b>{databaseError ? "MongoDB not reachable" : "MongoDB connected"}</b>
          <code>{databaseUri || "mongodb://127.0.0.1:27017/relay_lab"}</code>
          <span className="db-backend">{isUsingExpressBackend() || backend === "express" ? "EXPRESS API" : "NEXT ROUTE HANDLERS"}</span>
          <em>
            {databaseError
              ? "The simulator is fully client-side and keeps working. Start mongod or set MONGODB_URI to enable saving."
              : "Experiments persist in the experiments collection as BSON documents."}
          </em>
        </div>

        <div className="lab-grid">
          <aside className="control-panel">
            <div className="panel-title"><span>FLOW & ROUTING</span><small>Structural edits restart</small></div>
            <div className="protocol-switch" aria-label="Transport protocol">
              {["tcp", "udp"].map((protocol) => (
                <button key={protocol} className={config.protocol === protocol ? "active" : ""} onClick={() => applyConfig({ protocol })}>
                  {protocol.toUpperCase()}<small>{protocol === "tcp" ? "reliable" : "datagram"}</small>
                </button>
              ))}
            </div>
            <div className="field-grid">
              <label><span>Source</span><select value={config.source} onChange={(event) => selectEndpoint("source", event.target.value)}>{endpoints.map((node) => <option key={node.id} value={node.id}>{node.label} · {node.address}</option>)}</select></label>
              <label><span>Destination</span><select value={config.destination} onChange={(event) => selectEndpoint("destination", event.target.value)}>{endpoints.map((node) => <option key={node.id} value={node.id}>{node.label} · {node.address}</option>)}</select></label>
            </div>
            <label className="select-control"><span>Routing policy</span><select value={config.routing} onChange={(event) => applyConfig({ routing: event.target.value })}>{ROUTING_MODES.map((mode) => <option value={mode.id} key={mode.id}>{mode.label}</option>)}</select><small>{routeDescription}</small></label>

            <div className="control-divider"><span>NETWORK CONDITIONS</span><i>LIVE</i></div>
            <RangeControl label="Link capacity" value={config.capacityScale} display={`${Math.round(config.capacityScale * 100)}%`} min={0.25} max={2} step={0.05} onChange={(capacityScale) => applyConfig({ capacityScale })} />
            <RangeControl label="Added propagation" value={config.addedLatency} display={`${config.addedLatency} ms`} min={0} max={200} step={5} onChange={(addedLatency) => applyConfig({ addedLatency })} />
            <RangeControl label="Additional loss" value={config.lossRate} display={`${(config.lossRate * 100).toFixed(1)}%`} min={0} max={0.2} step={0.005} onChange={(lossRate) => applyConfig({ lossRate })} />
            <RangeControl label="Output queue" value={config.queueLimit} display={`${config.queueLimit} packets`} min={1} max={30} onChange={(queueLimit) => applyConfig({ queueLimit })} />

            <button className="advanced-toggle" onClick={() => setAdvancedOpen((value) => !value)} aria-expanded={advancedOpen}>
              Flow & transport parameters <ChevronDown size={15} className={advancedOpen ? "rotated" : ""} />
            </button>
            <AnimatePresence initial={false}>
              {advancedOpen && (
                <motion.div className="advanced-controls" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <RangeControl label="Packet count" value={config.packetCount} display={config.packetCount} min={1} max={80} onChange={(packetCount) => applyConfig({ packetCount })} />
                  <RangeControl label="Payload size" value={config.packetSize} display={`${config.packetSize} B`} min={64} max={9000} step={64} onChange={(packetSize) => applyConfig({ packetSize })} />
                  <RangeControl label="Release spacing" value={config.spacing} display={`${config.spacing} ms`} min={5} max={1000} step={5} onChange={(spacing) => applyConfig({ spacing })} />
                  <RangeControl label="Packet TTL" value={config.ttl} display={`${config.ttl} hops`} min={2} max={64} onChange={(ttl) => applyConfig({ ttl })} />
                  {config.protocol === "tcp" && <>
                    <RangeControl label="Send window" value={config.window} display={`${config.window} packets`} min={1} max={24} onChange={(window) => applyConfig({ window })} />
                    <RangeControl label="Maximum attempts" value={config.maxAttempts} display={config.maxAttempts} min={1} max={8} onChange={(maxAttempts) => applyConfig({ maxAttempts })} />
                  </>}
                  <RangeControl label="Random seed" value={config.seed} display={config.seed} min={1} max={999} onChange={(seed) => applyConfig({ seed })} hint="The same seed repeats the same loss sequence." />
                </motion.div>
              )}
            </AnimatePresence>
          </aside>

          <main className="canvas-panel">
            <div className="canvas-meta">
              <div><span>{topology.kicker}</span><strong>{topology.name}</strong></div>
              <div className="canvas-legend"><span><i className="legend-tcp" />TCP</span><span><i className="legend-udp" />UDP</span><span><i className="legend-route" />Route</span><span><i className="legend-failed" />Failed</span></div>
            </div>
            <div className="canvas-wrap">
              <TopologyCanvas
                topology={topology}
                snapshot={snapshot}
                selectedNode={selectedNode}
                selectedLink={selectedLink}
                selectedPacket={selectedPacket}
                onNodeClick={handleNodeClick}
                onLinkClick={(id) => { setSelectedLink(id); setSelectedNode(null); setSelectedPacket(null); }}
                onClearSelection={() => { setSelectedLink(null); setSelectedNode(null); setSelectedPacket(null); }}
              />
              <div className="canvas-instruction">Click a link to inspect · Click host = source · Shift + click = destination</div>
            </div>

            <AnimatePresence mode="wait">
              {(selectedLinkData || selectedNodeData || selectedPacketData) && (
                <motion.div className="selection-inspector" key={selectedLinkData?.id ?? selectedNodeData?.id ?? selectedPacketData?.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                  {selectedLinkData && <>
                    <div><span>SELECTED INTERFACE</span><strong>{selectedLinkData.id}</strong><small>{selectedLinkData.a} ↔ {selectedLinkData.b}</small></div>
                    <dl><div><dt>Capacity</dt><dd>{selectedLinkData.bandwidth * config.capacityScale} Mbps</dd></div><div><dt>Base delay</dt><dd>{selectedLinkData.latency} ms</dd></div><div><dt>Loss</dt><dd>{((selectedLinkData.loss + config.lossRate) * 100).toFixed(1)}%</dd></div></dl>
                    <button className={selectedLinkData.failed ? "repair" : "danger"} onClick={() => toggleLink(selectedLinkData.id)}>{selectedLinkData.failed ? <><Check size={14} />Restore link</> : <><CircleStop size={14} />Disable link</>}</button>
                  </>}
                  {!selectedLinkData && selectedNodeData && <>
                    <div><span>{selectedNodeData.role.toUpperCase()}</span><strong>{selectedNodeData.label}</strong><small>{selectedNodeData.detail}</small></div>
                    <dl><div><dt>Address</dt><dd>{selectedNodeData.address}</dd></div><div><dt>Queued</dt><dd>{snapshot.queueByNode[selectedNodeData.id] ?? 0}</dd></div></dl>
                    {selectedNodeData.role !== "router" && <div className="inspector-actions"><button onClick={() => selectEndpoint("source", selectedNodeData.id)}>Set source</button><button onClick={() => selectEndpoint("destination", selectedNodeData.id)}>Set destination</button></div>}
                  </>}
                  {!selectedLinkData && !selectedNodeData && selectedPacketData && <>
                    <div><span>PACKET INSPECTOR</span><strong>SEQ {selectedPacketData.sequence}</strong><small>{selectedPacketData.status} · {selectedPacketData.dropReason || `${selectedPacketData.size} byte payload`}</small></div>
                    <dl><div><dt>Attempts</dt><dd>{selectedPacketData.attempts}</dd></div><div><dt>TTL</dt><dd>{selectedPacketData.remainingTtl}</dd></div><div><dt>Route</dt><dd>{selectedPacketData.route.map((id) => topology.nodes.find((node) => node.id === id)?.label).join(" → ") || "Not yet routed"}</dd></div></dl>
                    <button onClick={() => setSelectedPacket(null)}>Clear selection</button>
                  </>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="playback-bar">
              <div className="playback-main">
                <button className="play-button" onClick={togglePlayback} aria-label={isPlaying ? "Pause simulation" : "Play simulation"}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
                <button onClick={stepSimulation} disabled={snapshot.completed}><SkipForward size={15} />+100 ms</button>
                <button onClick={resetSimulation}><RotateCcw size={15} />Reset</button>
              </div>
              <div className="speed-control"><span>SPEED</span>{[0.5, 1, 2, 4].map((speed) => <button key={speed} className={config.speed === speed ? "active" : ""} onClick={() => applyConfig({ speed })}>{speed}×</button>)}</div>
              <button className="compare-button" onClick={compareTransports}><GitCompareArrows size={15} />Compare TCP / UDP</button>
            </div>
          </main>

          <aside className="metrics-panel">
            <div className="panel-title"><span>LIVE TELEMETRY</span><Activity size={14} /></div>
            <div className="metric-grid">
              <MetricCard label="Delivered" value={snapshot.metrics.deliveryRate.toFixed(0)} unit="%" detail={`${snapshot.metrics.delivered} / ${snapshot.metrics.generated} packets`} tone="lime" />
              <MetricCard label="Mean delay" value={snapshot.metrics.averageLatency.toFixed(1)} unit="ms" detail={`${snapshot.metrics.jitter.toFixed(1)} ms jitter`} tone="cyan" />
              <MetricCard label="Goodput" value={snapshot.metrics.throughput.toFixed(2)} unit="Mbps" detail="Delivered bits / time" />
              <MetricCard label="Retries" value={snapshot.metrics.retransmissions} unit="" detail={`${snapshot.metrics.recoveryDelay.toFixed(0)} ms recovery`} tone={snapshot.metrics.retransmissions ? "orange" : ""} />
            </div>
            <TelemetryChart series={snapshot.timeSeries} />
            <div className="mini-stats">
              <div><span>Signal losses</span><b>{snapshot.metrics.signalLosses}</b></div>
              <div><span>Tail drops</span><b>{snapshot.metrics.queueDrops}</b></div>
              <div><span>In flight</span><b>{snapshot.metrics.inFlight}</b></div>
              <div><span>Completed hops</span><b>{snapshot.metrics.completedHops}</b></div>
            </div>
            <div className="export-actions"><button onClick={exportJson}><Braces size={14} />JSON</button><button onClick={exportCsv}><FileSpreadsheet size={14} />CSV</button></div>
          </aside>
        </div>

        <div className="lab-data-panel">
          <div className="data-tabs">
            <button className={activeTab === "events" ? "active" : ""} onClick={() => setActiveTab("events")}>Event stream <b>{snapshot.events.length}</b></button>
            <button className={activeTab === "packets" ? "active" : ""} onClick={() => setActiveTab("packets")}>Packet ledger <b>{snapshot.packets.length}</b></button>
            <button className={activeTab === "links" ? "active" : ""} onClick={() => setActiveTab("links")}>Link health <b>{snapshot.links.filter((link) => link.failed).length || ""}</b></button>
            <span>All values are measured from this run</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={activeTab} className="data-tab-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {activeTab === "events" && <EventStream events={snapshot.events} onSelectPacket={(id) => { setSelectedPacket(id); setSelectedLink(null); setSelectedNode(null); }} />}
              {activeTab === "packets" && <PacketLedger packets={snapshot.packets} selectedPacket={selectedPacket} onSelectPacket={(id) => { setSelectedPacket(id); setSelectedLink(null); setSelectedNode(null); }} />}
              {activeTab === "links" && <LinkHealth links={snapshot.links} selectedLink={selectedLink} onSelectLink={(id) => { setSelectedLink(id); setSelectedNode(null); setSelectedPacket(null); }} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {saveOpen && <Modal title="Save this measurement" eyebrow="MONGODB / EXPERIMENT COLLECTION" onClose={() => !saving && setSaveOpen(false)}>
          <form className="save-form" onSubmit={saveExperiment}>
            <label><span>Experiment name</span><input autoFocus maxLength={120} value={saveName} onChange={(event) => setSaveName(event.target.value)} required /></label>
            <label><span>Observation or viva note <i>optional</i></span><textarea maxLength={1200} rows={4} placeholder="What changed? Which result do you want to explain later?" value={saveNotes} onChange={(event) => setSaveNotes(event.target.value)} /></label>
            <div className="save-summary"><span>{topology.name}</span><span>{config.protocol.toUpperCase()}</span><span>{snapshot.metrics.delivered} delivered</span><span>{formatTime(snapshot.time)}</span></div>
            <button className="modal-primary" disabled={saving || !saveName.trim()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{saving ? "Saving measurement…" : "Save experiment"}</button>
          </form>
        </Modal>}

        {savedOpen && <Modal title="Saved experiments" eyebrow={`${experiments.length} STORED RUNS`} onClose={() => setSavedOpen(false)} wide>
          <div className="saved-list">
            {!experiments.length && <div className="empty-state"><FolderOpen size={28} /><h4>No saved measurements yet</h4><p>Run the lab, then choose Save run. Your configuration, packet results, and notes are written to MongoDB and will appear here.</p></div>}
            {experiments.map((experiment) => (
              <article className="saved-run" key={experiment.id}>
                <div className="saved-run-top"><span>{getTopology(experiment.topologyId).shortName} / {experiment.protocol.toUpperCase()}</span><time>{new Date(experiment.createdAt).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" })}</time></div>
                <h4>{experiment.name}</h4>
                {experiment.notes && <p>{experiment.notes}</p>}
                <div className="saved-run-metrics"><span><b>{Number(experiment.results?.metrics?.deliveryRate ?? 0).toFixed(0)}%</b> delivered</span><span><b>{Number(experiment.results?.metrics?.averageLatency ?? 0).toFixed(1)} ms</b> mean delay</span><span><b>{experiment.results?.metrics?.retransmissions ?? 0}</b> retries</span></div>
                <div className="saved-run-actions"><button onClick={() => loadExperiment(experiment)}><Play size={14} />Reload setup</button><button className="delete" onClick={() => deleteExperiment(experiment.id)} aria-label={`Delete ${experiment.name}`}><Trash2 size={14} /></button></div>
              </article>
            ))}
          </div>
        </Modal>}

        {compareOpen && <Modal title="Transport comparison" eyebrow="SERVER-SIDE / HEADLESS RUNS" onClose={() => setCompareOpen(false)} wide>
          {comparing && <div className="comparison-loading"><LoaderCircle className="spin" size={28} /><h4>Running two complete simulations</h4><p>Same topology, flow schedule, routing policy, failures, and initial seed.</p></div>}
          {comparison && <div className="comparison-content">
            <div className="comparison-note">{comparison.method}</div>
            <div className="comparison-table">
              <div className="comparison-head"><span>Measured result</span><strong>TCP</strong><strong>UDP</strong></div>
              {[
                ["Delivery ratio", (run) => `${run.metrics.deliveryRate.toFixed(1)}%`],
                ["Mean end-to-end delay", (run) => `${run.metrics.averageLatency.toFixed(1)} ms`],
                ["Goodput", (run) => `${run.metrics.throughput.toFixed(3)} Mbps`],
                ["Jitter", (run) => `${run.metrics.jitter.toFixed(1)} ms`],
                ["Retransmissions", (run) => run.metrics.retransmissions],
                ["Loss / drop events", (run) => run.metrics.dropEvents],
                ["Simulated duration", (run) => formatTime(run.elapsed)],
              ].map(([label, read]) => <div className="comparison-row" key={label}><span>{label}</span><b>{read(comparison.tcp)}</b><b>{read(comparison.udp)}</b></div>)}
            </div>
            {(comparison.tcp.capped || comparison.udp.capped) && <p className="comparison-warning">One run reached the 240-second simulation cap before every packet became terminal; its partial result is shown honestly.</p>}
            <button className="modal-primary" onClick={() => { applyConfig({ protocol: config.protocol === "tcp" ? "udp" : "tcp" }); setCompareOpen(false); }}>Switch live lab to {config.protocol === "tcp" ? "UDP" : "TCP"}</button>
          </div>}
        </Modal>}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <motion.div className={`toast toast-${toast.tone}`} key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}><span>{toast.tone === "success" ? <Check size={16} /> : <Activity size={16} />}</span>{toast.message}<button onClick={() => setToast(null)}><X size={14} /></button></motion.div>}
      </AnimatePresence>
    </section>
  );
}
