import "./globals.css";

export const metadata = {
  title: "RELAY — Interactive Network Systems Lab",
  description:
    "A JavaScript computer networks project: simulate routing, packet queues, loss, TCP recovery, UDP delivery, and link failure across four complete topologies. Backend: Node.js, Express, and MongoDB.",
  keywords: ["computer networks", "CS project", "packet switching", "Dijkstra", "TCP", "UDP", "JavaScript", "Express", "MongoDB"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
