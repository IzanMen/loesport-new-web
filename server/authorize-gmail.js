import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";

import { google } from "googleapis";

let clientId = process.env.GMAIL_CLIENT_ID;
let clientSecret = process.env.GMAIL_CLIENT_SECRET;
const refreshTokenFile = process.env.GMAIL_REFRESH_TOKEN_FILE;
const oauthCredentialsFile = process.env.GOOGLE_OAUTH_CLIENT_FILE;
const port = Number(process.env.OAUTH_PORT) || 53682;
const redirectUri = `http://localhost:${port}/oauth2callback`;

if (oauthCredentialsFile) {
  const credentials = JSON.parse(await readFile(oauthCredentialsFile, "utf8"));
  const client = credentials.installed || credentials.web;
  clientId ||= client?.client_id;
  clientSecret ||= client?.client_secret;
}

if (!clientId || !clientSecret) {
  console.error("Define GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET antes de ejecutar este comando.");
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const state = crypto.randomBytes(24).toString("hex");
const authorizationUrl = oauth.generateAuthUrl({
  access_type: "offline",
  include_granted_scopes: true,
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
  state,
});

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, redirectUri);
  if (url.pathname !== "/oauth2callback") {
    response.writeHead(404).end("No encontrado");
    return;
  }
  if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("La autorización no es válida. Puedes cerrar esta ventana e intentarlo de nuevo.");
    return;
  }

  try {
    const { tokens } = await oauth.getToken(url.searchParams.get("code"));
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<h1>Gmail autorizado</h1><p>Ya puedes cerrar esta ventana y volver al terminal.</p>");
    if (!tokens.refresh_token) {
      throw new Error("Google no ha devuelto un token de actualización.");
    }

    if (refreshTokenFile) {
      await writeFile(refreshTokenFile, tokens.refresh_token, { mode: 0o600 });
      const lifetime = Number(tokens.refresh_token_expires_in) || 0;
      console.log(
        lifetime
          ? `\nAutorización completada. Google ha emitido un token temporal (${lifetime} segundos).\n`
          : "\nAutorización completada. Google ha emitido un token sin caducidad programada.\n",
      );
    } else {
      console.log("\nGMAIL_REFRESH_TOKEN:\n");
      console.log(tokens.refresh_token);
      console.log("\nGuarda este valor en Secret Manager; no lo añadas al repositorio.\n");
    }
  } catch (error) {
    console.error("No se pudo completar la autorización:", error.message);
  } finally {
    server.close();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Abre esta URL en el navegador e inicia sesión con sanchezginesizan@gmail.com:\n");
  console.log(authorizationUrl);
  console.log(`\nEsperando la autorización en ${redirectUri} ...`);
});
