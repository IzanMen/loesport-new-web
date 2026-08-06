import { resolve } from "node:path";
import { defineConfig } from "vite";

const formApiTarget = process.env.FORM_API_TARGET || "https://loesport-web-473754422972.europe-southwest1.run.app";
const formApiOrigin = new URL(formApiTarget).origin;

const pages = {
  main: "index.html",
  gruposMao: "grupos-mao.html",
  gruposAlaior: "grupos-alaior.html",
  gruposMercadal: "grupos-mercadal.html",
  historia: "historia.html",
  ascensoDivisionHonor: "ascenso-division-honor.html",
  hazteSocio: "hazte-socio.html",
  patrocinadores: "patrocinadores.html",
  equipamiento: "equipamiento.html",
  productoEquipacion: "producto-equipacion.html",
  inscripcion: "inscripcion.html",
  preinscripcion: "preinscripcion.html",
  baja: "baja.html",
  licencias: "licencias.html",
  proteccionDatos: "proteccion-de-datos.html",
  privacidad: "politica-de-privacidad.html",
  cookies: "politica-de-cookies.html",
};

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: formApiTarget,
        changeOrigin: true,
        headers: {
          origin: formApiOrigin,
        },
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: formApiTarget,
        changeOrigin: true,
        headers: {
          origin: formApiOrigin,
        },
      },
    },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([name, file]) => [name, resolve(__dirname, file)])),
    },
  },
});
