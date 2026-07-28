const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.text());

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

    if (esp32) {
        esp32.send(req.body);
        res.send("Mensaje enviado");
    } else {
        res.status(503).send("ESP32 no conectado");
    }

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Servidor iniciado");
});