const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");


const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_STT_MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v1";

const BUILDERBOT_PROJECT_ID = process.env.BUILDERBOT_PROJECT_ID;
const BUILDERBOT_API_KEY = process.env.BUILDERBOT_API_KEY;
const BUILDERBOT_NUMBER = process.env.BUILDERBOT_NUMBER;


const app = express();

app.use(express.json());
app.use(express.text({ type: "text/plain" }));


// Configuración para recibir archivos
const upload = multer({
    dest: "uploads/"
});


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

    } else if (req.body.mensaje) {

        mensaje = req.body.mensaje;

    } else if (req.body.texto) {

        mensaje = req.body.texto;

    } else if (req.body.message) {

        mensaje = req.body.message;

    } else {

        mensaje = JSON.stringify(req.body);

    }



    if (!esp32) {

        return res.status(503).json({
            ok: false,
            error: "ESP32 no conectado"
        });

    }



    esp32.send(mensaje);



    return res.json({

        ok: true,

        mensaje: "Mensaje enviado"

    });


});




async function transcribirAudio(filePath) {

    const form = new FormData();

    form.append("file", fs.createReadStream(filePath), {
        filename: "audio.wav",
        contentType: "audio/wav"
    });

    form.append("model_id", ELEVENLABS_STT_MODEL);


    const response = await axios.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        form,
        {
            headers: {
                ...form.getHeaders(),
                "xi-api-key": ELEVENLABS_API_KEY
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        }
    );


    return response.data.text;

}



async function enviarABuilderBot(texto) {

    const url = `https://app.builderbot.cloud/api/v2/${BUILDERBOT_PROJECT_ID}/messages`;

    const response = await axios.post(
        url,
        {
            messages: {
                content: texto
            },
            number: BUILDERBOT_NUMBER,
            checkIfExists: false
        },
        {
            headers: {
                "Content-Type": "application/json",
                "x-api-builderbot": BUILDERBOT_API_KEY
            }
        }
    );


    return response.data;

}



// Recibe el audio del ESP32, lo transcribe con ElevenLabs (STT) y
// manda el texto resultante a BuilderBot por HTTP.

app.post("/audio", upload.single("audio"), async (req, res) => {


    if(!req.file)
    {

        return res.status(400).json({

            ok:false,

            error:"No se recibió audio"

        });

    }



    console.log("Audio recibido:");

    console.log(req.file);


    if(!ELEVENLABS_API_KEY || !BUILDERBOT_PROJECT_ID || !BUILDERBOT_API_KEY)
    {

        console.error("Faltan variables de entorno: ELEVENLABS_API_KEY / BUILDERBOT_PROJECT_ID / BUILDERBOT_API_KEY");

        fs.unlink(req.file.path, () => {});

        return res.status(500).json({

            ok:false,

            error:"Servidor mal configurado (faltan variables de entorno)"

        });

    }



    try
    {

        const texto = await transcribirAudio(req.file.path);

        console.log("Transcripción:", texto);


        await enviarABuilderBot(texto);

        console.log("Enviado a BuilderBot");


        fs.unlink(req.file.path, () => {});


        return res.json({

            ok:true,

            mensaje:"Audio procesado",

            texto

        });

    }
    catch(error)
    {

        console.error(
            "Error procesando audio:",
            error.response ? error.response.data : error.message
        );


        fs.unlink(req.file.path, () => {});


        return res.status(500).json({

            ok:false,

            error:"Error procesando audio"

        });

    }


});



const PORT = process.env.PORT || 3000;


server.listen(PORT, () => {

    console.log("Servidor iniciado");


    if(!ELEVENLABS_API_KEY)
    {
        console.warn("ATENCIÓN: falta ELEVENLABS_API_KEY en las variables de entorno");
    }

    if(!BUILDERBOT_PROJECT_ID)
    {
        console.warn("ATENCIÓN: falta BUILDERBOT_PROJECT_ID en las variables de entorno");
    }

    if(!BUILDERBOT_API_KEY)
    {
        console.warn("ATENCIÓN: falta BUILDERBOT_API_KEY en las variables de entorno");
    }

    if(!BUILDERBOT_NUMBER)
    {
        console.warn("ATENCIÓN: falta BUILDERBOT_NUMBER en las variables de entorno");
    }

});
