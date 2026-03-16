import * as xb from "xrblocks";

const BUTTON_ASPECT = 2.5; // width:height ratio for the start button

export class WelcomePanel {
  constructor({ onStart }) {
    this.panel = new xb.SpatialPanel({
      width: 2,
      height: 1.2,
      backgroundColor: "#0b0b0be6",
    });

    const grid = this.panel.addGrid();

    grid.addRow({ weight: 0.09 }); // top spacer

    // Row 1: icon + title side by side, centered as a unit
    const headerRow = grid.addRow({ weight: 0.28 });
    headerRow.addCol({ weight: 0.23 }); // left spacer
    headerRow.addCol({ weight: 0.18 }).add(
      new xb.ImageView({
        src: "/src/assets/packpro-logo.png",
      }),
    );
    const titleText = headerRow.addCol({ weight: 0.4 }).addText({
      text: "Pack Pro",
      fontSize: 0.2,
      fontColor: "#ffffff",
      textAlign: "left",
      anchorX: "left",
      anchorY: "middle",
    });
    titleText.x = -0.45;

    // Row 2: description
    grid.addRow({ weight: 0.3 }).addText({
      text: "Your AI-powered packing assistant.\nPress the button below to begin.",
      fontSize: 0.05,
      fontColor: "#d2d2d2",
      textAlign: "center",
      anchorX: "center",
      anchorY: "middle",
    });

    // Row 3: start button
    const startButton = grid.addRow({ weight: 0.3 }).addTextButton({
      text: "Start Packing!",
      fontColor: "#ffffff",
      backgroundColor: "#2f2c61",
      fontSize: 0.25,
      radius: 0.02,
      opacity: 1,
      maxWidth: BUTTON_ASPECT,
    });
    startButton.onTriggered = onStart;

    // Stretch the button mesh to a wide rectangle.
    // uBoxSize must match the aspect ratio so corners stay circular in world space.
    const BUTTON_HEIGHT = 0.6; // <1.0 = shorter than default square height
    startButton.mesh.scale.set(BUTTON_ASPECT, BUTTON_HEIGHT, 1);
    startButton.mesh.material.uniforms.uBoxSize.value.set(
      0.5 * BUTTON_ASPECT,
      0.5 * BUTTON_HEIGHT,
    );

    grid.addRow({ weight: 0.06 }); // bottom spacer

    this.panel.position.set(0, 1.6, -1.5);
    this.panel.scale.setScalar(0.5);
  }
}
