import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generatePDF(project) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let fi = 0; fi < project.floors.length; fi++) {
    const floor = project.floors[fi];
    const { walls = [], windows = [], doors = [], rooms = [] } = floor;

    // --- Plan page ---
    const page = doc.addPage([595, 842]);
    const { width, height } = page.getSize();

    page.drawText(`${project.name}`, {
      x: 50, y: height - 40, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`${floor.name}  |  ${new Date().toLocaleDateString()}`, {
      x: 50, y: height - 60, size: 11, font, color: rgb(0.4, 0.4, 0.4),
    });

    const ox = 50, oy = 120, sc = 0.35;

    // Rooms fill
    for (const room of rooms) {
      if (room.points.length < 3) continue;
      // Draw as light polygon — pdf-lib doesn't have polygon fill easily, draw rectangle approx
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of room.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
      page.drawRectangle({
        x: ox + minX * sc, y: oy + (800 - maxY) * sc,
        width: (maxX - minX) * sc, height: (maxY - minY) * sc,
        color: rgb(0.85, 0.92, 1), borderWidth: 0,
      });
      // Area label
      page.drawText(`${room.area} cm²`, {
        x: ox + ((minX + maxX) / 2) * sc - 20,
        y: oy + (800 - (minY + maxY) / 2) * sc - 5,
        size: 7, font, color: rgb(0.3, 0.5, 0.7),
      });
    }

    // Walls
    for (const w of walls) {
      page.drawLine({
        start: { x: ox + w.x1 * sc, y: oy + (800 - w.y1) * sc },
        end: { x: ox + w.x2 * sc, y: oy + (800 - w.y2) * sc },
        thickness: (w.thickness || 20) * sc,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    // Windows
    for (const win of windows) {
      page.drawRectangle({
        x: ox + win.x * sc - 12, y: oy + (800 - win.y) * sc - 3,
        width: 24, height: 6,
        color: rgb(0.3, 0.6, 0.9),
      });
    }

    // Doors
    for (const door of doors) {
      page.drawRectangle({
        x: ox + door.x * sc - 14, y: oy + (800 - door.y) * sc - 4,
        width: 28, height: 8,
        color: rgb(0.7, 0.4, 0.2),
      });
    }

    // --- Table page ---
    const pg2 = doc.addPage([595, 842]);
    let cy = height - 50;

    pg2.drawText(`${floor.name} — Elements`, {
      x: 50, y: cy, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    });
    cy -= 30;

    // Walls table
    pg2.drawText("Walls", { x: 50, y: cy, size: 12, font: fontBold });
    cy -= 16;
    pg2.drawText("#      Length       Height     Thickness    Material", {
      x: 50, y: cy, size: 8, font: fontBold, color: rgb(0.4, 0.4, 0.4),
    });
    cy -= 12;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const len = Math.round(Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2));
      pg2.drawText(
        `${(i + 1).toString().padEnd(7)}${(len + " cm").padEnd(13)}${((w.height || 280) + " cm").padEnd(11)}${((w.thickness || 20) + " cm").padEnd(13)}${w.material || "Brick"}`,
        { x: 50, y: cy, size: 8, font }
      );
      cy -= 12;
      if (cy < 60) break;
    }

    cy -= 15;
    pg2.drawText(`Windows: ${windows.length}`, { x: 50, y: cy, size: 12, font: fontBold });
    cy -= 14;
    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      pg2.drawText(`${i + 1}. (${Math.round(w.x)}, ${Math.round(w.y)})  ${w.width || 100}x${w.height || 120} cm`, {
        x: 50, y: cy, size: 8, font,
      });
      cy -= 12;
      if (cy < 60) break;
    }

    cy -= 15;
    pg2.drawText(`Doors: ${doors.length}`, { x: 50, y: cy, size: 12, font: fontBold });
    cy -= 14;
    for (let i = 0; i < doors.length; i++) {
      const d = doors[i];
      pg2.drawText(`${i + 1}. (${Math.round(d.x)}, ${Math.round(d.y)})  ${d.width || 90}x${d.height || 210} cm`, {
        x: 50, y: cy, size: 8, font,
      });
      cy -= 12;
      if (cy < 60) break;
    }

    cy -= 15;
    pg2.drawText(`Rooms: ${rooms.length}`, { x: 50, y: cy, size: 12, font: fontBold });
    cy -= 14;
    for (let i = 0; i < rooms.length; i++) {
      pg2.drawText(`${i + 1}. Area: ${rooms[i].area} cm²`, { x: 50, y: cy, size: 8, font });
      cy -= 12;
      if (cy < 60) break;
    }
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  downloadBlob(blob, `${project.name}.pdf`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
