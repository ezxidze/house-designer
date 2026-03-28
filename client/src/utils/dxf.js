// Minimal DXF R12 exporter
export function generateDXF(project) {
  let dxf = "";

  const w = (s) => { dxf += s + "\n"; };

  // Header
  w("0"); w("SECTION");
  w("2"); w("HEADER");
  w("9"); w("$ACADVER"); w("1"); w("AC1009");
  w("0"); w("ENDSEC");

  // Tables (minimal)
  w("0"); w("SECTION");
  w("2"); w("TABLES");
  w("0"); w("TABLE"); w("2"); w("LAYER");
  w("70"); w("4");

  const layers = ["WALLS", "WINDOWS", "DOORS", "ROOMS"];
  const colors = [7, 5, 1, 3]; // white, blue, red, green
  for (let i = 0; i < layers.length; i++) {
    w("0"); w("LAYER");
    w("2"); w(layers[i]);
    w("70"); w("0");
    w("62"); w(String(colors[i]));
    w("6"); w("CONTINUOUS");
  }

  w("0"); w("ENDTAB");
  w("0"); w("ENDSEC");

  // Entities
  w("0"); w("SECTION");
  w("2"); w("ENTITIES");

  for (const floor of project.floors) {
    const yOff = 0; // Could offset floors vertically

    // Walls as LINE
    for (const wall of floor.walls) {
      w("0"); w("LINE");
      w("8"); w("WALLS");
      w("10"); w(String(wall.x1));
      w("20"); w(String(-wall.y1 + yOff));
      w("30"); w("0");
      w("11"); w(String(wall.x2));
      w("21"); w(String(-wall.y2 + yOff));
      w("31"); w("0");
    }

    // Windows as short LINE segments
    for (const win of floor.windows) {
      const hw = (win.width || 100) / 4;
      w("0"); w("LINE");
      w("8"); w("WINDOWS");
      w("10"); w(String(win.x - hw));
      w("20"); w(String(-win.y + yOff));
      w("30"); w("0");
      w("11"); w(String(win.x + hw));
      w("21"); w(String(-win.y + yOff));
      w("31"); w("0");
    }

    // Doors as LINE + ARC
    for (const door of floor.doors) {
      const hw = (door.width || 90) / 4;
      w("0"); w("LINE");
      w("8"); w("DOORS");
      w("10"); w(String(door.x - hw));
      w("20"); w(String(-door.y + yOff));
      w("30"); w("0");
      w("11"); w(String(door.x + hw));
      w("21"); w(String(-door.y + yOff));
      w("31"); w("0");

      // Door swing arc
      w("0"); w("ARC");
      w("8"); w("DOORS");
      w("10"); w(String(door.x - hw));
      w("20"); w(String(-door.y + yOff));
      w("30"); w("0");
      w("40"); w(String(hw * 2)); // radius
      w("50"); w("0"); // start angle
      w("51"); w("90"); // end angle
    }

    // Rooms as closed POLYLINE
    for (const room of floor.rooms) {
      if (room.points.length < 3) continue;
      w("0"); w("POLYLINE");
      w("8"); w("ROOMS");
      w("66"); w("1");
      w("70"); w("1"); // closed

      for (const pt of room.points) {
        w("0"); w("VERTEX");
        w("8"); w("ROOMS");
        w("10"); w(String(pt.x));
        w("20"); w(String(-pt.y + yOff));
        w("30"); w("0");
      }

      w("0"); w("SEQEND");
    }

    // Room area text
    for (const room of floor.rooms) {
      if (room.points.length < 3) continue;
      const cx = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
      const cy = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
      w("0"); w("TEXT");
      w("8"); w("ROOMS");
      w("10"); w(String(cx));
      w("20"); w(String(-cy + yOff));
      w("30"); w("0");
      w("40"); w("20"); // text height
      w("1"); w(`${room.area} cm2`);
    }
  }

  w("0"); w("ENDSEC");
  w("0"); w("EOF");

  const blob = new Blob([dxf], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}
