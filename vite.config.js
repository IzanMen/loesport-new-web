import { resolve } from "node:path";
import { defineConfig } from "vite";

const pages = {
  main: "index.html",
  gruposMao: "grupos-mao.html",
  gruposAlaior: "grupos-alaior.html",
  gruposMercadal: "grupos-mercadal.html",
  historia: "historia.html",
  ascensoDivisionHonor: "ascenso-division-honor.html",
  hazteSocio: "hazte-socio.html",
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
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([name, file]) => [name, resolve(__dirname, file)])),
    },
  },
});
