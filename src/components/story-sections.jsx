"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { ArrowDown, ArrowRight, ChevronDown, Cpu, Database, Network, Play, Route, Server, ShieldCheck } from "lucide-react";
import { CONCEPTS, PROTOCOL_NOTES, TOPOLOGIES, VIVA_QUESTIONS, getTopology } from "@/lib/network-data";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="site-logo" href="#top" aria-label="Relay home"><span className="logo-mark"><i /><i /><i /></span><b>RELAY</b><small>NETWORK SYSTEMS LAB</small></a>
      <nav aria-label="Main navigation"><a href="#lab">Live lab</a><a href="#model">The model</a><a href="#scenarios">Scenarios</a><a href="#viva">Viva notes</a></nav>
      <a className="header-cta" href="#lab">Launch experiment <ArrowRight size={14} /></a>
    </header>
  );
}

const heroRoutes = [
  ["student-a", "west", "core", "east", "web-1"],
  ["student-b", "west", "north", "east", "dns-1"],
  ["admin", "south", "core", "north", "web-1"],
];

export function Hero() {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 0.72]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 170]);
  const sceneRotate = useTransform(scrollYProgress, [0, 1], [0, 7]);
  const sceneClip = useTransform(scrollYProgress, [0, 1], ["inset(0% 0% 0% 0% round 28px)", "inset(12% 8% 12% 8% round 60px)"]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const gridScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const topology = getTopology("campus");
  const nodes = new Map(topology.nodes.map((node) => [node.id, { ...node, px: node.x * 7.2, py: 30 + node.y * 3.65 }]));

  return (
    <section className="hero" id="top" ref={ref}>
      <div className="hero-sticky">
        <motion.div className="hero-grid" style={reducedMotion ? undefined : { scale: gridScale }} />
        <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
        <motion.div className="hero-copy" style={reducedMotion ? undefined : { y: titleY, opacity: titleOpacity }}>
          <motion.div className="hero-eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}>
            <span><i />INTERACTIVE CS PROJECT</span><b>NETWORKING & COMMUNICATION</b>
          </motion.div>
          <h1 aria-label="The network is not a black box">
            {["The network", "is not a", "black box."].map((line, index) => (
              <span className={`title-mask ${index === 2 ? "accent-line" : ""}`} key={line}>
                <motion.span initial={{ y: "110%", rotate: 2 }} animate={{ y: 0, rotate: 0 }} transition={{ delay: 0.12 + index * 0.11, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}>{line}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}>
            A real-time packet-switching laboratory. Change the route, constrain the queue, break a link—and watch every consequence unfold.
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7 }}>
            <a className="primary-cta" href="#lab"><Play size={16} fill="currentColor" />Enter the live lab</a>
            <a className="text-cta" href="#model">How the model works <ArrowDown size={15} /></a>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-scene"
          initial={{ opacity: 0, scale: 0.86, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.35, duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
          style={reducedMotion ? undefined : { scale: sceneScale, y: sceneY, rotate: sceneRotate, clipPath: sceneClip }}
        >
          <div className="scene-top"><span><i />CAMPUS BACKBONE / LIVE MODEL</span><b>DIJKSTRA · SEED 42</b></div>
          <svg viewBox="0 0 720 430" aria-hidden="true">
            <g className="hero-links">
              {topology.links.map((link) => <line key={link.id} x1={nodes.get(link.a).px} y1={nodes.get(link.a).py} x2={nodes.get(link.b).px} y2={nodes.get(link.b).py} />)}
            </g>
            <g className="hero-nodes">
              {topology.nodes.map((node) => {
                const p = nodes.get(node.id);
                return <g key={node.id} transform={`translate(${p.px} ${p.py})`}><circle r={node.role === "router" ? 8 : 11} /><circle className="hero-node-ring" r="18" /><text y="31" textAnchor="middle">{node.label}</text></g>;
              })}
            </g>
            <g className="hero-packets">
              {heroRoutes.map((route, index) => {
                const xs = route.map((id) => nodes.get(id).px);
                const ys = route.map((id) => nodes.get(id).py);
                return <motion.circle key={index} r="5" initial={{ cx: xs[0], cy: ys[0] }} animate={reducedMotion ? { cx: xs[0], cy: ys[0] } : { cx: xs, cy: ys }} transition={{ duration: 5.5 + index, delay: index * 1.2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }} />;
              })}
            </g>
          </svg>
          <div className="scene-readout"><div><span>ROUTING</span><b>Dynamic / per hop</b></div><div><span>QUEUING</span><b>Finite / FIFO</b></div><div><span>TRANSPORT</span><b>TCP + UDP</b></div></div>
        </motion.div>

        <motion.div className="hero-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15, duration: 0.8 }}>
          <div><b>04</b><span>Authored<br />networks</span></div><div><b>20 ms</b><span>Fixed simulation<br />time step</span></div><div><b>100%</b><span>Stateful browser<br />engine</span></div>
          <a href="#model"><span>SCROLL TO TRACE THE JOURNEY</span><ArrowDown size={15} /></a>
        </motion.div>
      </div>
    </section>
  );
}

export function ProtocolStackScene() {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const appX = useTransform(scrollYProgress, [0, 0.55, 1], ["-28vw", "-9vw", "0vw"]);
  const netX = useTransform(scrollYProgress, [0, 0.55, 1], ["28vw", "9vw", "0vw"]);
  const appY = useTransform(scrollYProgress, [0, 0.55, 1], [-120, -80, -15]);
  const transY = useTransform(scrollYProgress, [0, 0.55, 1], [40, 0, 0]);
  const netY = useTransform(scrollYProgress, [0, 0.55, 1], [180, 80, 15]);
  const appRotate = useTransform(scrollYProgress, [0, 0.6, 1], [-9, -2, 0]);
  const netRotate = useTransform(scrollYProgress, [0, 0.6, 1], [9, 2, 0]);
  const layerScale = useTransform(scrollYProgress, [0.7, 1], [1, 0.88]);
  const packetOpacity = useTransform(scrollYProgress, [0.67, 0.9], [0, 1]);
  const packetScale = useTransform(scrollYProgress, [0.67, 1], [0.7, 1.15]);
  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const layers = [
    { name: "APPLICATION", detail: "Meaningful payload", icon: BracesIcon, x: appX, y: appY, rotate: appRotate, color: "white" },
    { name: "TRANSPORT", detail: "Sequence · ACK · window", icon: ShieldCheck, x: 0, y: transY, rotate: 0, color: "lime" },
    { name: "NETWORK", detail: "Route · TTL · next hop", icon: Route, x: netX, y: netY, rotate: netRotate, color: "cyan" },
  ];
  return (
    <section className="stack-scene" id="model" ref={ref}>
      <div className="stack-sticky">
        <div className="stack-copy">
          <span className="eyebrow">02 / THE JOURNEY</span>
          <h2>One message.<br /><em>Three decisions.</em></h2>
          <p>Scroll to encapsulate the message. The lab then sends it through a stateful graph where capacity, delay, queues, failure, and transport policy all leave measurable traces.</p>
        </div>
        <div className="stack-diagram">
          <div className="stack-progress"><motion.i style={reducedMotion ? { height: "100%" } : { height: progressHeight }} /></div>
          {layers.map((layer, index) => {
            const Icon = layer.icon;
            return <motion.div key={layer.name} className={`stack-layer layer-${layer.color}`} style={reducedMotion ? { transform: `translateY(${(index - 1) * 82}px)` } : { x: layer.x, y: layer.y, rotate: layer.rotate, scale: layerScale }}><span>0{index + 1}</span><Icon size={21} /><div><b>{layer.name}</b><small>{layer.detail}</small></div></motion.div>;
          })}
          <motion.div className="encapsulated-packet" style={reducedMotion ? { opacity: 0 } : { opacity: packetOpacity, scale: packetScale }}><span>PACKET</span><b>SEQ 001</b><i /></motion.div>
        </div>
        <div className="stack-caption"><span>SCROLL PROGRESS</span><b>ENCAPSULATION → FORWARDING → DELIVERY</b></div>
      </div>
    </section>
  );
}

function BracesIcon(props) {
  return <Network {...props} />;
}

export function ScenarioLibrary() {
  const load = (id) => {
    window.dispatchEvent(new CustomEvent("relay:scenario", { detail: id }));
    document.getElementById("lab")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section className="scenario-section" id="scenarios">
      <div className="section-heading">
        <div><span className="eyebrow">03 / SCENARIO LIBRARY</span><h2>Different networks.<br />Different questions.</h2></div>
        <p>Four individually modeled environments, not four skins. Each has its own graph, addresses, link capacities, delays, base loss, flow, and learning objective.</p>
      </div>
      <div className="scenario-grid">
        {TOPOLOGIES.map((topology, index) => (
          <motion.article className="scenario-card" key={topology.id} initial={{ opacity: 0, y: 50, rotate: index % 2 ? 1.5 : -1.5 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.65, delay: index * 0.08 }}>
            <div className="scenario-card-top"><span>{topology.index}</span><div>{topology.tags.map((tag) => <i key={tag}>{tag}</i>)}</div></div>
            <h3>{topology.name}</h3><span className="scenario-kicker">{topology.kicker}</span>
            <p>{topology.description}</p>
            <div className="learning-goal"><b>TRY THIS</b>{topology.learningGoal}</div>
            <div className="scenario-facts"><span><b>{topology.nodes.length}</b> nodes</span><span><b>{topology.links.length}</b> duplex links</span><span><b>{topology.config.packetCount ?? 32}</b> packets</span></div>
            <button onClick={() => load(topology.id)}>Load in workbench <ArrowRight size={16} /></button>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export function LearningSections() {
  const [protocol, setProtocol] = useState("tcp");
  const [openQuestion, setOpenQuestion] = useState(0);
  const activeProtocol = PROTOCOL_NOTES.find((item) => item.id === protocol);
  return (
    <>
      <section className="concepts-section">
        <div className="section-heading"><div><span className="eyebrow">04 / UNDER THE HOOD</span><h2>Rules you can<br />interrogate.</h2></div><p>The visual layer is only a projection. These are the mechanisms producing every route, delay, drop, retry, and chart value.</p></div>
        <div className="concept-list">
          {CONCEPTS.map((concept, index) => <motion.article key={concept.number} initial={{ opacity: 0, x: index % 2 ? 60 : -60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.7 }}><span className="concept-number">{concept.number}</span><div><i>{concept.tag}</i><h3>{concept.title}</h3><p>{concept.body}</p><code>{concept.code}</code></div></motion.article>)}
        </div>
      </section>

      <section className="protocol-section">
        <div className="protocol-heading"><span className="eyebrow dark">TRANSPORT FIELD GUIDE</span><h2>Same network.<br />Different promises.</h2></div>
        <div className="protocol-tabs">{PROTOCOL_NOTES.map((item) => <button key={item.id} className={protocol === item.id ? "active" : ""} onClick={() => setProtocol(item.id)}>{item.name}<span>{item.fullName}</span></button>)}</div>
        <AnimatePresence mode="wait">
          <motion.div className={`protocol-detail protocol-${activeProtocol.accent}`} key={activeProtocol.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div><span>{activeProtocol.name} / BEHAVIOR</span><h3>{activeProtocol.summary}</h3></div>
            <div><p>{activeProtocol.detail}</p><ul>{activeProtocol.fields.map((field) => <li key={field}>{field}</li>)}</ul><button className="protocol-lab-link" onClick={() => { window.dispatchEvent(new CustomEvent("relay:protocol", { detail: activeProtocol.id })); document.getElementById("lab")?.scrollIntoView({ behavior: "smooth" }); }}>Test {activeProtocol.name} in the lab <ArrowRight size={15} /></button></div>
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="architecture-section">
        <div className="architecture-intro"><span className="eyebrow">05 / PROJECT ARCHITECTURE</span><h2>Built to be explained,<br />not just demonstrated.</h2><p>Written entirely in JavaScript — no TypeScript. React renders the interface, a Node.js Express service exposes the REST API, and Mongoose persists experiments as BSON documents in MongoDB. No external network claims or synthetic “AI” analysis.</p></div>
        <div className="architecture-grid">
          <article><Cpu size={23} /><span>01 / CLIENT</span><h3>Deterministic engine</h3><p>Fixed 20 ms steps, seeded pseudo-random loss, graph search, directed interface state, and immutable UI snapshots.</p></article>
          <article><Server size={23} /><span>02 / SERVER</span><h3>Reproducible comparisons</h3><p>An Express REST API validates each configuration and runs independent TCP and UDP experiments to completion, or to an explicit 240-second simulation cap.</p></article>
          <article><Database size={23} /><span>03 / DATA</span><h3>Evidence that persists</h3><p>A Mongoose schema stores the exact setup, failed links, per-packet outcomes, measured metrics, and your written observations in MongoDB, indexed by creation time.</p></article>
        </div>
        <div className="model-boundary"><ShieldCheck size={21} /><div><b>Model boundary</b><p>This is an educational packet-switching simulator, not a socket analyzer or a full TCP/IP stack. ACK transmission, congestion control, IP fragmentation, and physical wireless behavior are intentionally outside the model.</p></div></div>
      </section>

      <section className="viva-section" id="viva">
        <div className="viva-heading"><span className="eyebrow">06 / VIVA PREP</span><h2>Questions worth<br />asking after the demo.</h2><p>Short answers anchored to things you can actually test in the workbench.</p></div>
        <div className="question-list">
          {VIVA_QUESTIONS.map((item, index) => <article className={openQuestion === index ? "open" : ""} key={item.question}><button onClick={() => setOpenQuestion(openQuestion === index ? null : index)} aria-expanded={openQuestion === index}><span>{String(index + 1).padStart(2, "0")}</span><b>{item.question}</b><ChevronDown size={18} /></button><AnimatePresence initial={false}>{openQuestion === index && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p>{item.answer}</p></motion.div>}</AnimatePresence></article>)}
        </div>
      </section>
    </>
  );
}

export function Footer() {
  return <footer className="site-footer"><div className="footer-logo">RELAY<span>®</span></div><div><p>An interactive computer networks project.<br />Observe the mechanism. Question the result.</p><a href="#top">Back to top <ArrowRight size={14} /></a></div><div className="footer-meta"><span>JAVASCRIPT / REACT / NODE.JS</span><span>EXPRESS / MONGODB / MONGOOSE</span><span>NETWORKING & COMMUNICATION</span></div></footer>;
}
