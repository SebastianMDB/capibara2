import { AppController } from "./controllers/app-controller.js";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("No se encontró el contenedor #app.");
}

new AppController(root).start();
