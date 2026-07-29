const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.json());
app.use(express.text({ type: "text/plain" }));

const server = http.createServer(app);

const wss = new WebSocket.Server({
    server,
    path: "/ws"
});

let esp32 = null;

wss.on("connection", (ws) => {

    console.log("ESP32 conectado");

    esp32 = ws;

    ws.on("close", () => {
        console.log("ESP32 desconectado");
        esp32 = null;
    });

});

app.get("/", (req, res) => {
    res.send("Servidor funcionando");
});

app.post("/mensaje", (req, res) => {

    let mensaje = "";

    if (typeof req.body === "string") {
        mensaje = req.body;
    } else if (req.body.texto) {
        mensaje = req.body.texto;
    } else if (req.body.message) {
        mensaje = req.body.message;
    } else {
        mensaje = JSON.stringify(req.body);
    }

    if (!esp32) {
        return res.status(503).send("ESP32 no conectado");
    }

    esp32.send(mensaje);

    res.send("Mensaje enviado");

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Servidor iniciado");
});
