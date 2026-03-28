const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { PrismaClient } = require("@prisma/client");
const { generatePDF } = require("./pdf");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- REST API ---

// Get all projects
app.get("/api/projects", async (req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  res.json(projects);
});

// Get single project
app.get("/api/projects/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
  });
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json({ ...project, data: JSON.parse(project.data) });
});

// Create project
app.post("/api/projects", async (req, res) => {
  const { name, data } = req.body;
  const project = await prisma.project.create({
    data: { name: name || "Untitled", data: JSON.stringify(data || { walls: [], windows: [], doors: [] }) },
  });
  res.status(201).json({ ...project, data: JSON.parse(project.data) });
});

// Update project
app.put("/api/projects/:id", async (req, res) => {
  const { name, data } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (data !== undefined) updateData.data = JSON.stringify(data);
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: updateData,
  });
  res.json({ ...project, data: JSON.parse(project.data) });
});

// Delete project
app.delete("/api/projects/:id", async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Generate PDF
app.post("/api/projects/:id/pdf", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
  });
  if (!project) return res.status(404).json({ error: "Not found" });

  const pdfBytes = await generatePDF(project.name, JSON.parse(project.data));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${project.name}.pdf"`);
  res.send(Buffer.from(pdfBytes));
});

// --- WebSocket ---
const wss = new WebSocketServer({ server, path: "/ws" });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("message", (raw) => {
    // Broadcast to all other clients
    const msg = raw.toString();
    for (const client of clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(msg);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
