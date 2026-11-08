export const DEFAULT_CONFIG = {
  topologyId: "campus",
  source: "student-a",
  destination: "web-1",
  protocol: "tcp",
  packetCount: 32,
  packetSize: 1200,
  spacing: 90,
  capacityScale: 1,
  addedLatency: 0,
  lossRate: 0.01,
  queueLimit: 8,
  ttl: 20,
  routing: "latency",
  speed: 1,
  seed: 42,
  window: 8,
  maxAttempts: 4,
};

export const TOPOLOGIES = [
  {
    id: "campus",
    index: "01",
    name: "Campus backbone",
    shortName: "Campus",
    kicker: "Redundant / low delay",
    description:
      "A two-building campus with dual distribution paths. A core link can fail without isolating the web server, making this a clear first experiment in shortest-path recalculation.",
    learningGoal: "Compare the shortest latency path with the fewest-hop path, then fail core-east and watch traffic reroute through the north router.",
    tags: ["Dijkstra", "Redundancy", "LAN"],
    config: { source: "student-a", destination: "web-1", routing: "latency", lossRate: 0.01 },
    nodes: [
      { id: "student-a", label: "Lab A", role: "host", x: 8, y: 70, address: "10.10.1.11", detail: "Computer laboratory" },
      { id: "student-b", label: "Lab B", role: "host", x: 8, y: 28, address: "10.10.2.11", detail: "Design studio" },
      { id: "admin", label: "Admin", role: "host", x: 25, y: 91, address: "10.10.3.8", detail: "Administration VLAN" },
      { id: "west", label: "WEST", role: "router", x: 26, y: 49, address: "10.10.0.1", detail: "Access router" },
      { id: "core", label: "CORE", role: "router", x: 47, y: 50, address: "10.10.0.2", detail: "Campus core" },
      { id: "north", label: "NORTH", role: "router", x: 48, y: 17, address: "10.10.0.3", detail: "Distribution north" },
      { id: "south", label: "SOUTH", role: "router", x: 49, y: 81, address: "10.10.0.4", detail: "Distribution south" },
      { id: "east", label: "EAST", role: "router", x: 70, y: 50, address: "10.10.0.5", detail: "Server farm gateway" },
      { id: "web-1", label: "WEB", role: "server", x: 92, y: 27, address: "10.20.1.10", detail: "HTTPS server · :443" },
      { id: "dns-1", label: "DNS", role: "server", x: 92, y: 73, address: "10.20.2.10", detail: "DNS server · :53" },
    ],
    links: [
      { id: "lab-a-west", a: "student-a", b: "west", bandwidth: 100, latency: 2, loss: 0 },
      { id: "lab-b-west", a: "student-b", b: "west", bandwidth: 100, latency: 2, loss: 0 },
      { id: "admin-south", a: "admin", b: "south", bandwidth: 100, latency: 3, loss: 0 },
      { id: "west-core", a: "west", b: "core", bandwidth: 1000, latency: 3, loss: 0 },
      { id: "west-north", a: "west", b: "north", bandwidth: 100, latency: 6, loss: 0.001 },
      { id: "west-south", a: "west", b: "south", bandwidth: 100, latency: 7, loss: 0.001 },
      { id: "north-core", a: "north", b: "core", bandwidth: 1000, latency: 2, loss: 0 },
      { id: "north-east", a: "north", b: "east", bandwidth: 1000, latency: 4, loss: 0 },
      { id: "core-east", a: "core", b: "east", bandwidth: 1000, latency: 2, loss: 0 },
      { id: "core-south", a: "core", b: "south", bandwidth: 1000, latency: 3, loss: 0 },
      { id: "south-east", a: "south", b: "east", bandwidth: 100, latency: 6, loss: 0.001 },
      { id: "north-web", a: "north", b: "web-1", bandwidth: 100, latency: 9, loss: 0.002 },
      { id: "east-web", a: "east", b: "web-1", bandwidth: 1000, latency: 2, loss: 0 },
      { id: "east-dns", a: "east", b: "dns-1", bandwidth: 1000, latency: 2, loss: 0 },
    ],
  },
  {
    id: "datacenter",
    index: "02",
    name: "Leaf–spine fabric",
    shortName: "Data center",
    kicker: "Parallel / high capacity",
    description:
      "Two spines connect three server leaves. Several paths have identical hop counts, so queue-aware routing can outperform a static metric when a flow concentrates on one interface.",
    learningGoal: "Run a dense burst with a small output queue. Switch between highest-capacity and adaptive routing and inspect tail drops on each leaf.",
    tags: ["ECMP fabric", "Queuing", "Goodput"],
    config: { source: "client", destination: "db-1", routing: "adaptive", packetCount: 48, spacing: 35, queueLimit: 6, lossRate: 0 },
    nodes: [
      { id: "client", label: "CLIENT", role: "host", x: 6, y: 50, address: "172.16.0.20", detail: "Load generator" },
      { id: "edge", label: "EDGE", role: "router", x: 20, y: 50, address: "172.16.0.1", detail: "Border router" },
      { id: "spine-a", label: "SPINE A", role: "router", x: 40, y: 24, address: "10.0.0.1", detail: "Fabric spine · A" },
      { id: "spine-b", label: "SPINE B", role: "router", x: 40, y: 76, address: "10.0.0.2", detail: "Fabric spine · B" },
      { id: "leaf-a", label: "LEAF A", role: "router", x: 62, y: 15, address: "10.0.1.1", detail: "Web rack leaf" },
      { id: "leaf-b", label: "LEAF B", role: "router", x: 63, y: 50, address: "10.0.2.1", detail: "Application rack leaf" },
      { id: "leaf-c", label: "LEAF C", role: "router", x: 62, y: 85, address: "10.0.3.1", detail: "Storage rack leaf" },
      { id: "web-1", label: "WEB 01", role: "server", x: 88, y: 9, address: "10.1.0.11", detail: "Frontend replica 01" },
      { id: "web-2", label: "WEB 02", role: "server", x: 88, y: 34, address: "10.1.0.12", detail: "Frontend replica 02" },
      { id: "db-1", label: "DB 01", role: "server", x: 88, y: 66, address: "10.3.0.11", detail: "Primary database" },
      { id: "cache-1", label: "CACHE", role: "server", x: 88, y: 91, address: "10.3.0.21", detail: "In-memory cache" },
    ],
    links: [
      { id: "client-edge", a: "client", b: "edge", bandwidth: 1000, latency: 1, loss: 0 },
      { id: "edge-spine-a", a: "edge", b: "spine-a", bandwidth: 1000, latency: 2, loss: 0 },
      { id: "edge-spine-b", a: "edge", b: "spine-b", bandwidth: 1000, latency: 2, loss: 0 },
      { id: "spine-a-leaf-a", a: "spine-a", b: "leaf-a", bandwidth: 400, latency: 2, loss: 0 },
      { id: "spine-a-leaf-b", a: "spine-a", b: "leaf-b", bandwidth: 400, latency: 2, loss: 0 },
      { id: "spine-a-leaf-c", a: "spine-a", b: "leaf-c", bandwidth: 400, latency: 2, loss: 0 },
      { id: "spine-b-leaf-a", a: "spine-b", b: "leaf-a", bandwidth: 400, latency: 2, loss: 0 },
      { id: "spine-b-leaf-b", a: "spine-b", b: "leaf-b", bandwidth: 400, latency: 2, loss: 0 },
      { id: "spine-b-leaf-c", a: "spine-b", b: "leaf-c", bandwidth: 400, latency: 2, loss: 0 },
      { id: "spines-peer", a: "spine-a", b: "spine-b", bandwidth: 100, latency: 5, loss: 0 },
      { id: "leaf-a-web-1", a: "leaf-a", b: "web-1", bandwidth: 100, latency: 1, loss: 0 },
      { id: "leaf-a-web-2", a: "leaf-a", b: "web-2", bandwidth: 100, latency: 1, loss: 0 },
      { id: "leaf-b-web-2", a: "leaf-b", b: "web-2", bandwidth: 100, latency: 2, loss: 0 },
      { id: "leaf-c-db-1", a: "leaf-c", b: "db-1", bandwidth: 100, latency: 1, loss: 0 },
      { id: "leaf-c-cache-1", a: "leaf-c", b: "cache-1", bandwidth: 100, latency: 1, loss: 0 },
      { id: "leaf-b-db-1", a: "leaf-b", b: "db-1", bandwidth: 40, latency: 4, loss: 0.001 },
    ],
  },
  {
    id: "global",
    index: "03",
    name: "Intercontinental WAN",
    shortName: "Global WAN",
    kicker: "Long haul / lossy",
    description:
      "A client in Mumbai reaches services in London, Virginia, and Singapore over links with deliberately different propagation delays. The shortest geographical path is not always the fastest available route.",
    learningGoal: "Increase additional latency and loss, compare London with Virginia, and observe how path delay changes TCP recovery delay while UDP simply loses data.",
    tags: ["Propagation", "RTT", "Packet loss"],
    config: { source: "mum-client", destination: "lon-app", routing: "latency", packetCount: 28, spacing: 130, addedLatency: 10, lossRate: 0.02, seed: 73 },
    nodes: [
      { id: "mum-client", label: "MUM CLIENT", role: "host", x: 6, y: 52, address: "192.0.2.44", detail: "Mumbai · ISP access" },
      { id: "mum-edge", label: "MUMBAI", role: "router", x: 23, y: 52, address: "203.0.113.1", detail: "Regional point of presence" },
      { id: "sg-core", label: "SINGAPORE", role: "router", x: 43, y: 83, address: "198.51.100.9", detail: "Asia-Pacific transit" },
      { id: "lon-core", label: "LONDON", role: "router", x: 45, y: 19, address: "198.51.100.2", detail: "European transit" },
      { id: "par-core", label: "PARIS", role: "router", x: 64, y: 43, address: "198.51.100.3", detail: "Terrestrial exchange" },
      { id: "ny-core", label: "NEW YORK", role: "router", x: 65, y: 79, address: "198.51.100.4", detail: "Atlantic landing station" },
      { id: "ash-core", label: "ASHBURN", role: "router", x: 80, y: 65, address: "198.51.100.5", detail: "US-East aggregation" },
      { id: "lon-app", label: "LON APP", role: "server", x: 72, y: 10, address: "203.0.113.80", detail: "London application · :443" },
      { id: "sg-api", label: "SG API", role: "server", x: 67, y: 93, address: "203.0.113.90", detail: "Singapore API · :443" },
      { id: "ash-db", label: "US DB", role: "server", x: 94, y: 65, address: "203.0.113.100", detail: "Virginia database · :5432" },
    ],
    links: [
      { id: "client-mum", a: "mum-client", b: "mum-edge", bandwidth: 40, latency: 8, loss: 0.002 },
      { id: "mum-lon", a: "mum-edge", b: "lon-core", bandwidth: 100, latency: 112, loss: 0.004 },
      { id: "mum-sg", a: "mum-edge", b: "sg-core", bandwidth: 80, latency: 48, loss: 0.002 },
      { id: "sg-ny", a: "sg-core", b: "ny-core", bandwidth: 45, latency: 176, loss: 0.008 },
      { id: "sg-api", a: "sg-core", b: "sg-api", bandwidth: 100, latency: 5, loss: 0.001 },
      { id: "sg-par", a: "sg-core", b: "par-core", bandwidth: 30, latency: 158, loss: 0.006 },
      { id: "lon-par", a: "lon-core", b: "par-core", bandwidth: 200, latency: 14, loss: 0.001 },
      { id: "lon-ny", a: "lon-core", b: "ny-core", bandwidth: 100, latency: 72, loss: 0.003 },
      { id: "lon-app", a: "lon-core", b: "lon-app", bandwidth: 100, latency: 4, loss: 0 },
      { id: "par-ny", a: "par-core", b: "ny-core", bandwidth: 60, latency: 68, loss: 0.003 },
      { id: "par-ash", a: "par-core", b: "ash-core", bandwidth: 40, latency: 86, loss: 0.004 },
      { id: "ny-ash", a: "ny-core", b: "ash-core", bandwidth: 200, latency: 11, loss: 0.001 },
      { id: "ash-db", a: "ash-core", b: "ash-db", bandwidth: 100, latency: 3, loss: 0 },
    ],
  },
  {
    id: "iot",
    index: "04",
    name: "Constrained IoT mesh",
    shortName: "IoT mesh",
    kicker: "Low power / constrained",
    description:
      "Battery-powered sensors share narrow, imperfect wireless links with a gateway. Small queues and loss expose the cost of large payloads and indiscriminate retransmission.",
    learningGoal: "Use UDP for a sensor stream, then switch to TCP. Reduce packet size and compare delivery ratio, delay, and the number of transmissions needed.",
    tags: ["Wireless", "Tail drop", "Transport"],
    config: { source: "temp", destination: "broker", protocol: "udp", routing: "adaptive", packetCount: 30, packetSize: 512, spacing: 150, capacityScale: 0.75, queueLimit: 5, lossRate: 0.035, seed: 19 },
    nodes: [
      { id: "temp", label: "TEMP", role: "host", x: 7, y: 18, address: "fd00::11", detail: "Temperature sensor" },
      { id: "air", label: "AIR", role: "host", x: 7, y: 50, address: "fd00::12", detail: "Air-quality sensor" },
      { id: "camera", label: "CAM", role: "host", x: 7, y: 82, address: "fd00::13", detail: "Low-power camera" },
      { id: "mesh-a", label: "MESH A", role: "router", x: 29, y: 25, address: "fd00::1", detail: "Battery mesh relay" },
      { id: "mesh-b", label: "MESH B", role: "router", x: 29, y: 75, address: "fd00::2", detail: "Mains mesh relay" },
      { id: "gateway", label: "GATEWAY", role: "router", x: 52, y: 50, address: "fd00::254", detail: "6LoWPAN border router" },
      { id: "edge", label: "EDGE", role: "router", x: 72, y: 30, address: "10.0.0.1", detail: "Local edge computer" },
      { id: "broker", label: "BROKER", role: "server", x: 93, y: 18, address: "10.0.0.20", detail: "MQTT broker · :1883" },
      { id: "dashboard", label: "DASHBOARD", role: "host", x: 93, y: 78, address: "10.0.0.30", detail: "Operations dashboard" },
    ],
    links: [
      { id: "temp-mesh-a", a: "temp", b: "mesh-a", bandwidth: 0.25, latency: 24, loss: 0.018 },
      { id: "air-mesh-a", a: "air", b: "mesh-a", bandwidth: 0.25, latency: 30, loss: 0.025 },
      { id: "air-mesh-b", a: "air", b: "mesh-b", bandwidth: 0.5, latency: 20, loss: 0.015 },
      { id: "camera-mesh-b", a: "camera", b: "mesh-b", bandwidth: 1, latency: 18, loss: 0.012 },
      { id: "mesh-peer", a: "mesh-a", b: "mesh-b", bandwidth: 0.25, latency: 35, loss: 0.02 },
      { id: "mesh-a-gateway", a: "mesh-a", b: "gateway", bandwidth: 0.5, latency: 28, loss: 0.012 },
      { id: "mesh-b-gateway", a: "mesh-b", b: "gateway", bandwidth: 1, latency: 20, loss: 0.008 },
      { id: "mesh-a-edge", a: "mesh-a", b: "edge", bandwidth: 0.25, latency: 42, loss: 0.025 },
      { id: "gateway-edge", a: "gateway", b: "edge", bandwidth: 10, latency: 8, loss: 0.002 },
      { id: "gateway-dashboard", a: "gateway", b: "dashboard", bandwidth: 10, latency: 12, loss: 0.002 },
      { id: "edge-broker", a: "edge", b: "broker", bandwidth: 20, latency: 5, loss: 0 },
      { id: "edge-dashboard", a: "edge", b: "dashboard", bandwidth: 20, latency: 5, loss: 0 },
    ],
  },
];

export const ROUTING_MODES = [
  { id: "latency", label: "Lowest latency", short: "Latency", description: "Dijkstra weight = propagation delay plus serialization delay." },
  { id: "hops", label: "Fewest hops", short: "Hops", description: "Every healthy link costs one, regardless of speed or congestion." },
  { id: "capacity", label: "Highest capacity", short: "Capacity", description: "Inverse-bandwidth weights favor high-capacity interfaces." },
  { id: "adaptive", label: "Adaptive load", short: "Adaptive", description: "Delay, output queues, active transfers, and loss all increase path cost." },
];

export const PROTOCOL_NOTES = [
  {
    id: "tcp",
    name: "TCP",
    fullName: "Transmission Control Protocol",
    accent: "lime",
    summary: "Reliability has a cost: lost data returns, consumes another transmission, and arrives later.",
    detail: "This lab models a sliding send window, per-packet ACK abstraction, adaptive recovery delay derived from observed delivery time, and a bounded retry count. It intentionally omits congestion-control algorithms, ACK packet transmission, and packet coalescing so that one marker remains one observable datagram.",
    fields: ["Sequence number", "Sliding window", "Adaptive retry timer", "Bounded retransmission"],
  },
  {
    id: "udp",
    name: "UDP",
    fullName: "User Datagram Protocol",
    accent: "cyan",
    summary: "A datagram is sent once. Loss is visible immediately and no recovery traffic is generated.",
    detail: "UDP mode uses the same routing, queueing, serialization, propagation, and loss pipeline as TCP, but a dropped datagram becomes terminal. This makes it useful for isolating network behavior from transport recovery behavior.",
    fields: ["Connectionless", "One transmission", "No retransmission", "Low recovery overhead"],
  },
];

export const CONCEPTS = [
  {
    number: "01",
    title: "Routing is a new decision at every router",
    tag: "NETWORK LAYER",
    body: "The simulator runs Dijkstra’s algorithm whenever a packet reaches a forwarding node. Only healthy links enter the graph. In adaptive mode, queued and active work adds cost, so two packets in the same flow can legitimately take different paths.",
    code: "cost(link) = delay + queueDelay + lossPenalty",
  },
  {
    number: "02",
    title: "Bandwidth is time, not a decorative number",
    tag: "LINK LAYER",
    body: "Each directed interface serves one packet at a time. Serialization delay is calculated from payload size and capacity; propagation delay is added separately. Arriving packets wait in a finite FIFO output queue, and a full queue performs a real tail drop.",
    code: "serialization = bits ÷ bitsPerSecond",
  },
  {
    number: "03",
    title: "Reliability changes the traffic you measure",
    tag: "TRANSPORT LAYER",
    body: "TCP-mode losses schedule another attempt after a recovery delay informed by observed latency. UDP-mode losses end that datagram immediately. Delivery ratio, retransmissions, throughput, and jitter therefore describe different things—and should never be collapsed into one score.",
    code: "goodput = deliveredBits ÷ elapsedTime",
  },
];

export const VIVA_QUESTIONS = [
  {
    question: "Why can a longer route deliver a packet sooner?",
    answer: "Hop count ignores propagation, serialization, and queueing. A three-hop path with idle high-capacity links can finish before a two-hop path whose output queue is full. Choose Lowest latency and Fewest hops in the data-center scenario to expose the difference.",
  },
  {
    question: "What is the difference between bandwidth and throughput?",
    answer: "Bandwidth is link capacity; throughput here is measured delivered bits divided by elapsed simulation time. Queueing, loss, release spacing, and retransmission prevent throughput from simply equalling the nominal bandwidth printed on a link.",
  },
  {
    question: "Why does packet loss increase latency in TCP mode?",
    answer: "The original attempt does not reach the destination. After recovery delay, another attempt must cross the path again. The measured end-to-end latency includes time from the original release to final delivery, so recovered packets usually have much higher latency.",
  },
  {
    question: "What happens when a link is disabled during transmission?",
    answer: "The active transfer is interrupted and its packet enters the transport loss path. Packets waiting for that interface are returned to their current router and forwarded again using a graph without the failed link. If no route remains, the packet cannot be delivered.",
  },
  {
    question: "Is this a full implementation of TCP or a physical network?",
    answer: "No. It is a deterministic educational packet-switching model. TCP congestion control, real sockets, IP fragmentation, ACK packet transmission, wireless interference, and operating-system scheduling are outside the model. Those boundaries are stated so the observed results are not mistaken for Internet measurements.",
  },
  {
    question: "Why use a seed for random packet loss?",
    answer: "A seeded pseudo-random generator makes an experiment reproducible. Resetting with the same topology, configuration, and seed repeats the same loss sequence; changing the seed tests whether a conclusion survives a different random sample.",
  },
];

export function getTopology(id) {
  return TOPOLOGIES.find((topology) => topology.id === id) ?? TOPOLOGIES[0];
}

export function getEndpoints(topology) {
  return topology.nodes.filter((node) => node.role !== "router");
}

export function createScenarioConfig(topologyId) {
  const topology = getTopology(topologyId);
  return { ...DEFAULT_CONFIG, ...topology.config, topologyId: topology.id };
}

export function sanitizeConfig(candidate = {}) {
  const fallback = createScenarioConfig(candidate.topologyId);
  const merged = { ...fallback, ...candidate };
  const topology = getTopology(merged.topologyId);
  const endpoints = getEndpoints(topology).map((node) => node.id);
  const number = (value, min, max, defaultValue) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : defaultValue;
  };

  return {
    topologyId: topology.id,
    source: endpoints.includes(merged.source) ? merged.source : fallback.source,
    destination: endpoints.includes(merged.destination) && merged.destination !== merged.source
      ? merged.destination
      : fallback.destination,
    protocol: merged.protocol === "udp" ? "udp" : "tcp",
    packetCount: Math.round(number(merged.packetCount, 1, 80, fallback.packetCount)),
    packetSize: Math.round(number(merged.packetSize, 64, 9000, fallback.packetSize)),
    spacing: Math.round(number(merged.spacing, 5, 1000, fallback.spacing)),
    capacityScale: number(merged.capacityScale, 0.25, 2, fallback.capacityScale),
    addedLatency: number(merged.addedLatency, 0, 200, fallback.addedLatency),
    lossRate: number(merged.lossRate, 0, 0.2, fallback.lossRate),
    queueLimit: Math.round(number(merged.queueLimit, 1, 30, fallback.queueLimit)),
    ttl: Math.round(number(merged.ttl, 2, 64, fallback.ttl)),
    routing: ROUTING_MODES.some((mode) => mode.id === merged.routing) ? merged.routing : fallback.routing,
    speed: [0.5, 1, 2, 4].includes(Number(merged.speed)) ? Number(merged.speed) : 1,
    seed: Math.round(number(merged.seed, 1, 999999, fallback.seed)),
    window: Math.round(number(merged.window, 1, 24, fallback.window)),
    maxAttempts: Math.round(number(merged.maxAttempts, 1, 8, fallback.maxAttempts)),
  };
}
