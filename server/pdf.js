const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

async function generatePDF(projectName, data) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { walls = [], windows = [], doors = [] } = data;

  // --- Page 1: Title + Floor Plan ---
  const page1 = doc.addPage([595, 842]); // A4
  const { width, height } = page1.getSize();

  // Title
  page1.drawText("House Project Report", {
    x: 50, y: height - 50, size: 24, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });
  page1.drawText(`Project: ${projectName}`, {
    x: 50, y: height - 80, size: 14, font, color: rgb(0.3, 0.3, 0.3),
  });
  page1.drawText(`Date: ${new Date().toLocaleDateString()}`, {
    x: 50, y: height - 100, size: 11, font, color: rgb(0.5, 0.5, 0.5),
  });

  // Draw floor plan
  const planOffsetX = 50;
  const planOffsetY = 150;
  const scale = 0.4;

  page1.drawText("Floor Plan", {
    x: 50, y: height - 140, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });

  // Draw walls on PDF
  for (const wall of walls) {
    const x1 = planOffsetX + wall.x1 * scale;
    const y1 = planOffsetY + (600 - wall.y1) * scale;
    const x2 = planOffsetX + wall.x2 * scale;
    const y2 = planOffsetY + (600 - wall.y2) * scale;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const thickness = (wall.thickness || 20) * scale;
    const nx = (-dy / len) * thickness / 2;
    const ny = (dx / len) * thickness / 2;

    page1.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: thickness,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  // Draw windows
  for (const win of windows) {
    const x = planOffsetX + win.x * scale;
    const y = planOffsetY + (600 - win.y) * scale;
    page1.drawRectangle({
      x: x - 10 * scale, y: y - 3 * scale,
      width: 20 * scale, height: 6 * scale,
      color: rgb(0.3, 0.6, 0.9),
    });
  }

  // Draw doors
  for (const door of doors) {
    const x = planOffsetX + door.x * scale;
    const y = planOffsetY + (600 - door.y) * scale;
    page1.drawRectangle({
      x: x - 12 * scale, y: y - 4 * scale,
      width: 24 * scale, height: 8 * scale,
      color: rgb(0.7, 0.4, 0.2),
    });
  }

  // --- Page 2: Elements Table ---
  const page2 = doc.addPage([595, 842]);

  page2.drawText("Elements Summary", {
    x: 50, y: height - 50, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });

  let curY = height - 90;

  // Walls table
  page2.drawText("Walls", { x: 50, y: curY, size: 14, font: fontBold });
  curY -= 20;
  page2.drawText("#    Length (cm)    Height (cm)    Material    Thickness (cm)", {
    x: 50, y: curY, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3),
  });
  curY -= 15;

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const len = Math.round(Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2));
    const line = `${i + 1}      ${len}              ${w.height || 280}            ${w.material || "Brick"}        ${w.thickness || 20}`;
    page2.drawText(line, { x: 50, y: curY, size: 9, font });
    curY -= 14;
    if (curY < 50) break;
  }

  curY -= 20;

  // Windows table
  page2.drawText("Windows", { x: 50, y: curY, size: 14, font: fontBold });
  curY -= 20;
  page2.drawText(`Total: ${windows.length}`, { x: 50, y: curY, size: 10, font });
  curY -= 14;
  for (let i = 0; i < windows.length; i++) {
    const win = windows[i];
    page2.drawText(`${i + 1}.  Position: (${Math.round(win.x)}, ${Math.round(win.y)})   Width: ${win.width || 100}   Height: ${win.height || 120}`, {
      x: 50, y: curY, size: 9, font,
    });
    curY -= 14;
    if (curY < 50) break;
  }

  curY -= 20;

  // Doors table
  page2.drawText("Doors", { x: 50, y: curY, size: 14, font: fontBold });
  curY -= 20;
  page2.drawText(`Total: ${doors.length}`, { x: 50, y: curY, size: 10, font });
  curY -= 14;
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    page2.drawText(`${i + 1}.  Position: (${Math.round(door.x)}, ${Math.round(door.y)})   Width: ${door.width || 90}   Height: ${door.height || 210}`, {
      x: 50, y: curY, size: 9, font,
    });
    curY -= 14;
    if (curY < 50) break;
  }

  return await doc.save();
}

module.exports = { generatePDF };
