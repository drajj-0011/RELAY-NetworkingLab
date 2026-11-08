import { getTopology, sanitizeConfig } from "./network-data.js";

const TERMINAL_STATES = new Set(["delivered", "dropped"]);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function directionKey(from, to) {
  return `${from}>${to}`;
}

export class NetworkSimulation {
  constructor(config, failedLinks = []) {
    this.failedLinks = new Set(failedLinks);
    this.reset(config, failedLinks);
  }

  reset(config = this.config, failedLinks = [...(this.failedLinks ?? [])]) {
    this.config = sanitizeConfig(config);
    this.topology = getTopology(this.config.topologyId);
    this.nodes = new Map(this.topology.nodes.map((node) => [node.id, node]));
    this.links = new Map(this.topology.links.map((link) => [link.id, link]));
    this.failedLinks = new Set(failedLinks.filter((id) => this.links.has(id)));
    this.random = seededRandom(this.config.seed);
    this.time = 0;
    this.accumulator = 0;
    this.eventId = 0;
    this.effectId = 0;
    this.events = [];
    this.effects = [];
    this.nextSampleAt = 250;
    this.timeSeries = [];
    this.rttEstimate = null;
    this.recoveryDelay = 450;
    this.jitterTotal = 0;
    this.jitterSamples = 0;
    this.lastDeliveredLatency = null;
    this.stats = {
      delivered: 0,
      deliveredBytes: 0,
      failed: 0,
      dropEvents: 0,
      signalLosses: 0,
      queueDrops: 0,
      retransmissions: 0,
      transmissions: 0,
      completedHops: 0,
    };
    this.runtime = new Map();
    this.linkStats = new Map();

    for (const link of this.topology.links) {
      this.linkStats.set(link.id, { busyMs: 0, transmitted: 0, dropped: 0 });
      for (const [from, to] of [[link.a, link.b], [link.b, link.a]]) {
        this.runtime.set(directionKey(from, to), {
          linkId: link.id,
          from,
          to,
          queue: [],
          active: null,
        });
      }
    }

    this.packets = Array.from({ length: this.config.packetCount }, (_, index) => ({
      id: `pkt-${index + 1}`,
      sequence: index + 1,
      protocol: this.config.protocol,
      source: this.config.source,
      destination: this.config.destination,
      size: this.config.packetSize,
      status: "pending",
      releaseTime: index * this.config.spacing,
      releasedAt: null,
      attemptStartedAt: null,
      deliveredAt: null,
      latency: null,
      currentNode: this.config.source,
      attempts: 0,
      remainingTtl: this.config.ttl,
      retryAt: null,
      route: [],
      visited: [this.config.source],
      dropReason: null,
    }));

    const route = this.findPath(this.config.source, this.config.destination);
    this.addEvent(
      "system",
      `${this.config.protocol.toUpperCase()} flow ready · ${this.config.packetCount} × ${this.config.packetSize} B · seed ${this.config.seed}`,
    );
    this.addEvent(
      route.length ? "route" : "error",
      route.length
        ? `Initial route: ${route.map((id) => this.nodes.get(id)?.label ?? id).join(" → ")}`
        : "No initial route to the selected destination",
    );
    this.sample();
    return this.getSnapshot();
  }

  updateConfig(config) {
    this.config = sanitizeConfig({ ...config, topologyId: this.topology.id });
  }

  addEvent(type, message, packetId = null) {
    this.events.push({ id: ++this.eventId, time: this.time, type, message, packetId });
    if (this.events.length > 140) this.events.splice(0, this.events.length - 140);
  }

  addEffect(type, data) {
    this.effects.push({ id: ++this.effectId, type, createdAt: this.time, expiresAt: this.time + 650, ...data });
    if (this.effects.length > 30) this.effects.shift();
  }

  getLinkBetween(a, b) {
    return this.topology.links.find(
      (link) => !this.failedLinks.has(link.id) && ((link.a === a && link.b === b) || (link.a === b && link.b === a)),
    );
  }

  serializationDelay(link) {
    const bitsPerSecond = Math.max(0.001, link.bandwidth * this.config.capacityScale) * 1_000_000;
    return (this.config.packetSize * 8 * 1000) / bitsPerSecond;
  }

  effectiveLoss(link) {
    return clamp(link.loss + this.config.lossRate, 0, 0.95);
  }

  linkWeight(link, from, to) {
    if (this.config.routing === "hops") return 1;
    const propagation = link.latency + this.config.addedLatency;
    const serialization = this.serializationDelay(link);
    if (this.config.routing === "capacity") {
      return 1000 / Math.max(0.001, link.bandwidth * this.config.capacityScale) + propagation * 0.02;
    }
    if (this.config.routing === "adaptive") {
      const directed = this.runtime.get(directionKey(from, to));
      const queueDelay = (directed?.queue.length ?? 0) * serialization;
      const activeDelay = directed?.active ? Math.max(0, directed.active.endTime - this.time) : 0;
      const lossPenalty = (propagation + serialization) * this.effectiveLoss(link) * 12;
      return propagation + serialization + queueDelay + activeDelay + lossPenalty;
    }
    return propagation + serialization;
  }

  findPath(source, destination) {
    if (source === destination) return [source];
    if (!this.nodes.has(source) || !this.nodes.has(destination)) return [];
    const distances = new Map(this.topology.nodes.map((node) => [node.id, Infinity]));
    const previous = new Map();
    const unvisited = new Set(this.topology.nodes.map((node) => node.id));
    distances.set(source, 0);

    while (unvisited.size) {
      let current = null;
      let best = Infinity;
      for (const id of unvisited) {
        const distance = distances.get(id);
        if (distance < best) {
          best = distance;
          current = id;
        }
      }
      if (current === null || best === Infinity) break;
      unvisited.delete(current);
      if (current === destination) break;

      for (const link of this.topology.links) {
        if (this.failedLinks.has(link.id)) continue;
        let neighbor = null;
        if (link.a === current) neighbor = link.b;
        if (link.b === current) neighbor = link.a;
        if (!neighbor || !unvisited.has(neighbor)) continue;
        const candidate = best + this.linkWeight(link, current, neighbor);
        if (candidate < distances.get(neighbor)) {
          distances.set(neighbor, candidate);
          previous.set(neighbor, current);
        }
      }
    }

    if (!previous.has(destination)) return [];
    const path = [destination];
    let cursor = destination;
    while (cursor !== source) {
      cursor = previous.get(cursor);
      if (!cursor) return [];
      path.unshift(cursor);
    }
    return path;
  }

  unacknowledgedCount() {
    if (this.config.protocol !== "tcp") return 0;
    return this.packets.filter((packet) => packet.releasedAt !== null && !TERMINAL_STATES.has(packet.status)).length;
  }

  dispatch(packet, isRetry = false) {
    if (packet.releasedAt === null) packet.releasedAt = this.time;
    packet.attempts += 1;
    if (packet.attempts > 1) {
      packet.currentNode = packet.source;
      packet.visited = [packet.source];
    }
    packet.attemptStartedAt = this.time;
    packet.remainingTtl = this.config.ttl;
    packet.retryAt = null;
    packet.dropReason = null;
    packet.status = "queued";
    this.stats.transmissions += 1;
    if (isRetry || packet.attempts > 1) this.stats.retransmissions += 1;
    if (packet.attempts === 1) {
      this.addEvent("send", `SEQ ${packet.sequence} released from ${this.nodes.get(packet.source).label}`, packet.id);
    } else {
      this.addEvent("retry", `SEQ ${packet.sequence} retransmitted · attempt ${packet.attempts}`, packet.id);
    }
    this.routeAndQueue(packet);
  }

  routeAndQueue(packet) {
    if (TERMINAL_STATES.has(packet.status)) return;
    if (packet.currentNode === packet.destination) {
      this.deliver(packet);
      return;
    }
    if (packet.currentNode !== packet.source) {
      packet.remainingTtl -= 1;
      if (packet.remainingTtl <= 0) {
        this.drop(packet, "TTL expired before destination", "ttl");
        return;
      }
    }

    const route = this.findPath(packet.currentNode, packet.destination);
    if (route.length < 2) {
      this.drop(packet, "No route to host", "route");
      return;
    }
    packet.route = route;
    const nextNode = route[1];
    const key = directionKey(packet.currentNode, nextNode);
    const directed = this.runtime.get(key);
    if (!directed || this.failedLinks.has(directed.linkId)) {
      this.drop(packet, "Output interface unavailable", "route");
      return;
    }
    if (directed.queue.length >= this.config.queueLimit) {
      this.drop(packet, `Tail drop at ${this.nodes.get(packet.currentNode).label} · queue ${this.config.queueLimit}/${this.config.queueLimit}`, "queue");
      this.linkStats.get(directed.linkId).dropped += 1;
      this.addEffect("drop", { nodeId: packet.currentNode });
      return;
    }
    packet.status = "queued";
    directed.queue.push(packet.id);
  }

  drop(packet, reason, kind = "signal") {
    if (TERMINAL_STATES.has(packet.status)) return;
    this.stats.dropEvents += 1;
    if (kind === "signal") this.stats.signalLosses += 1;
    if (kind === "queue") this.stats.queueDrops += 1;
    packet.dropReason = reason;

    if (this.config.protocol === "tcp" && packet.attempts < this.config.maxAttempts) {
      packet.status = "retry";
      packet.retryAt = this.time + this.recoveryDelay;
      this.addEvent(
        "loss",
        `${reason} · SEQ ${packet.sequence} retry in ${Math.round(this.recoveryDelay)} ms`,
        packet.id,
      );
      return;
    }

    packet.status = "dropped";
    this.stats.failed += 1;
    this.addEvent("error", `${reason} · SEQ ${packet.sequence} ${this.config.protocol === "tcp" ? "retry limit reached" : "datagram lost"}`, packet.id);
  }

  deliver(packet) {
    if (TERMINAL_STATES.has(packet.status)) return;
    packet.status = "delivered";
    packet.deliveredAt = this.time;
    packet.currentNode = packet.destination;
    if (packet.visited[packet.visited.length - 1] !== packet.destination) packet.visited.push(packet.destination);
    packet.latency = Math.max(0, this.time - (packet.releasedAt ?? 0));
    this.stats.delivered += 1;
    this.stats.deliveredBytes += packet.size;

    if (this.lastDeliveredLatency !== null) {
      this.jitterTotal += Math.abs(packet.latency - this.lastDeliveredLatency);
      this.jitterSamples += 1;
    }
    this.lastDeliveredLatency = packet.latency;

    if (this.config.protocol === "tcp") {
      const attemptRtt = Math.max(1, this.time - (packet.attemptStartedAt ?? this.time));
      this.rttEstimate = this.rttEstimate === null ? attemptRtt : this.rttEstimate * 0.8 + attemptRtt * 0.2;
      this.recoveryDelay = clamp(this.rttEstimate * 1.6 + 80, 180, 6000);
    }
    this.addEvent(
      "delivered",
      `SEQ ${packet.sequence} ${this.config.protocol === "tcp" ? "ACKed" : "received"} · ${packet.latency.toFixed(1)} ms · ${packet.attempts} attempt${packet.attempts === 1 ? "" : "s"}`,
      packet.id,
    );
    this.addEffect("delivered", { nodeId: packet.destination });
  }

  completeTransfers() {
    const due = [];
    for (const directed of this.runtime.values()) {
      if (directed.active && directed.active.endTime <= this.time) due.push(directed);
    }
    due.sort((a, b) => a.active.endTime - b.active.endTime);

    for (const directed of due) {
      const transfer = directed.active;
      if (!transfer || directed.active !== transfer) continue;
      directed.active = null;
      const packet = this.packets.find((item) => item.id === transfer.packetId);
      const link = this.links.get(directed.linkId);
      const linkStats = this.linkStats.get(directed.linkId);
      linkStats.busyMs += transfer.duration;
      linkStats.transmitted += 1;
      this.stats.completedHops += 1;
      if (!packet || TERMINAL_STATES.has(packet.status)) continue;

      if (this.random() < this.effectiveLoss(link)) {
        packet.currentNode = directed.from;
        linkStats.dropped += 1;
        this.addEffect("drop", { linkId: link.id, from: directed.from, to: directed.to });
        this.drop(packet, `Signal loss on ${link.id}`, "signal");
      } else {
        packet.currentNode = directed.to;
        if (packet.visited[packet.visited.length - 1] !== directed.to) packet.visited.push(directed.to);
        if (directed.to === packet.destination) this.deliver(packet);
        else this.routeAndQueue(packet);
      }
    }
  }

  startAvailableTransfers() {
    for (const directed of this.runtime.values()) {
      if (directed.active || !directed.queue.length || this.failedLinks.has(directed.linkId)) continue;
      const packetId = directed.queue.shift();
      const packet = this.packets.find((item) => item.id === packetId);
      if (!packet || TERMINAL_STATES.has(packet.status)) continue;
      const link = this.links.get(directed.linkId);
      const duration = Math.max(1, link.latency + this.config.addedLatency + this.serializationDelay(link));
      packet.status = "transmitting";
      directed.active = {
        packetId,
        linkId: directed.linkId,
        from: directed.from,
        to: directed.to,
        startTime: this.time,
        endTime: this.time + duration,
        duration,
      };
    }
  }

  releaseEligiblePackets() {
    for (const packet of this.packets) {
      if (packet.status === "retry" && packet.retryAt <= this.time) this.dispatch(packet, true);
    }
    for (const packet of this.packets) {
      if (packet.status !== "pending" || packet.releaseTime > this.time) continue;
      if (this.config.protocol === "tcp" && this.unacknowledgedCount() >= this.config.window) continue;
      this.dispatch(packet);
    }
  }

  enforceQueueLimits() {
    for (const directed of this.runtime.values()) {
      while (directed.queue.length > this.config.queueLimit) {
        const packetId = directed.queue.pop();
        const packet = this.packets.find((item) => item.id === packetId);
        if (packet && !TERMINAL_STATES.has(packet.status)) {
          this.linkStats.get(directed.linkId).dropped += 1;
          this.drop(packet, `Tail drop after queue limit changed at ${this.nodes.get(directed.from).label}`, "queue");
        }
      }
    }
  }

  step(delta) {
    this.time += delta;
    this.effects = this.effects.filter((effect) => effect.expiresAt > this.time);
    this.completeTransfers();
    this.enforceQueueLimits();
    this.releaseEligiblePackets();
    this.startAvailableTransfers();
    if (this.time >= this.nextSampleAt) {
      this.sample();
      this.nextSampleAt += 250;
    }
  }

  tick(delta) {
    if (this.isComplete()) return;
    this.accumulator += clamp(Number(delta) || 0, 0, 1000);
    while (this.accumulator >= 20 && !this.isComplete()) {
      this.step(20);
      this.accumulator -= 20;
    }
    if (this.isComplete()) this.accumulator = 0;
  }

  setLinkFailed(linkId, shouldFail) {
    if (!this.links.has(linkId)) return;
    const link = this.links.get(linkId);
    if (shouldFail) this.failedLinks.add(linkId);
    else this.failedLinks.delete(linkId);
    this.addEvent(shouldFail ? "error" : "system", `${linkId} ${shouldFail ? "disabled — recomputing affected routes" : "restored to the routing graph"}`);

    if (shouldFail) {
      for (const directed of this.runtime.values()) {
        if (directed.linkId !== linkId) continue;
        if (directed.active) {
          const transfer = directed.active;
          this.linkStats.get(linkId).busyMs += Math.max(0, this.time - transfer.startTime);
          directed.active = null;
          const packet = this.packets.find((item) => item.id === transfer.packetId);
          if (packet) {
            this.linkStats.get(linkId).dropped += 1;
            this.drop(packet, `${linkId} failed during transmission`, "signal");
          }
        }
        const waiting = [...directed.queue];
        directed.queue = [];
        for (const packetId of waiting) {
          const packet = this.packets.find((item) => item.id === packetId);
          if (packet && packet.status === "queued") {
            packet.currentNode = directed.from;
            this.routeAndQueue(packet);
          }
        }
      }
      this.startAvailableTransfers();
    }
  }

  isComplete() {
    return this.packets.length > 0 && this.packets.every((packet) => TERMINAL_STATES.has(packet.status));
  }

  metrics() {
    const latencies = this.packets.filter((packet) => packet.latency !== null).map((packet) => packet.latency);
    const averageLatency = latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0;
    const activeStates = new Set(["queued", "transmitting", "retry"]);
    const inFlight = this.packets.filter((packet) => activeStates.has(packet.status)).length;
    const pending = this.packets.filter((packet) => packet.status === "pending").length;
    const elapsedSeconds = this.time / 1000;
    return {
      generated: this.packets.length,
      delivered: this.stats.delivered,
      failed: this.stats.failed,
      pending,
      inFlight,
      deliveryRate: (this.stats.delivered / Math.max(1, this.packets.length)) * 100,
      averageLatency,
      jitter: this.jitterSamples ? this.jitterTotal / this.jitterSamples : 0,
      throughput: elapsedSeconds > 0 ? (this.stats.deliveredBytes * 8) / elapsedSeconds / 1_000_000 : 0,
      retransmissions: this.stats.retransmissions,
      transmissions: this.stats.transmissions,
      dropEvents: this.stats.dropEvents,
      signalLosses: this.stats.signalLosses,
      queueDrops: this.stats.queueDrops,
      completedHops: this.stats.completedHops,
      recoveryDelay: this.recoveryDelay,
      efficiency: (this.stats.delivered / Math.max(1, this.stats.transmissions)) * 100,
      completed: this.isComplete(),
    };
  }

  sample() {
    const metrics = this.metrics();
    this.timeSeries.push({
      time: this.time,
      throughput: metrics.throughput,
      inFlight: metrics.inFlight,
      delivered: metrics.delivered,
      drops: metrics.dropEvents,
      latency: metrics.averageLatency,
    });
    if (this.timeSeries.length > 240) this.timeSeries.shift();
  }

  getSnapshot() {
    const metrics = this.metrics();
    const activeTransfers = [];
    const queueByNode = Object.fromEntries(this.topology.nodes.map((node) => [node.id, 0]));
    for (const directed of this.runtime.values()) {
      queueByNode[directed.from] += directed.queue.length;
      if (directed.active) {
        const packet = this.packets.find((item) => item.id === directed.active.packetId);
        activeTransfers.push({
          ...directed.active,
          sequence: packet?.sequence ?? 0,
          protocol: packet?.protocol ?? this.config.protocol,
          progress: clamp((this.time - directed.active.startTime) / directed.active.duration, 0, 1),
        });
      }
    }

    return {
      time: this.time,
      topologyId: this.topology.id,
      config: { ...this.config },
      metrics,
      completed: metrics.completed,
      failedLinks: [...this.failedLinks],
      packets: this.packets.map((packet) => ({ ...packet, route: [...packet.route], visited: [...packet.visited] })),
      activeTransfers,
      queueByNode,
      links: this.topology.links.map((link) => {
        const stats = this.linkStats.get(link.id);
        const forward = this.runtime.get(directionKey(link.a, link.b));
        const reverse = this.runtime.get(directionKey(link.b, link.a));
        const activeBusy = [forward.active, reverse.active]
          .filter(Boolean)
          .reduce((sum, transfer) => sum + Math.max(0, this.time - transfer.startTime), 0);
        return {
          ...link,
          failed: this.failedLinks.has(link.id),
          queued: forward.queue.length + reverse.queue.length,
          active: Boolean(forward.active || reverse.active),
          utilization: clamp(((stats.busyMs + activeBusy) / Math.max(1, this.time)) * 100, 0, 100),
          transmitted: stats.transmitted,
          dropped: stats.dropped,
        };
      }),
      routePreview: this.findPath(this.config.source, this.config.destination),
      events: this.events.map((event) => ({ ...event })),
      effects: this.effects.map((effect) => ({ ...effect })),
      timeSeries: this.timeSeries.map((point) => ({ ...point })),
    };
  }
}

export function runHeadless(config, failedLinks = []) {
  const simulation = new NetworkSimulation(config, failedLinks);
  const timeCap = 240_000;
  while (!simulation.isComplete() && simulation.time < timeCap) simulation.tick(20);
  const snapshot = simulation.getSnapshot();
  return {
    config: snapshot.config,
    metrics: snapshot.metrics,
    packets: snapshot.packets,
    events: snapshot.events.slice(-30),
    elapsed: snapshot.time,
    capped: !snapshot.completed,
  };
}
