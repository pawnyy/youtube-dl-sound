const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const path = require("path");
const io = new Server(server);
const ytdl = require("@distube/ytdl-core");
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const blobStream = require('blob-stream');
const fs = require('fs');
const temp = require('temp').track();
var ss = require('socket.io-stream');

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.use(express.json())

app.get('/', (req, res) => {
    res.render('index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on("download", (data) => {
        const {url, start, end} = data;

        console.log("starting stream")
        temp.open({suffix: ".opus"}, (err, info) => {

            let ytdlStream = ytdl(url, {
                quality: 'highestaudio',
            }).pipe(fs.createWriteStream(info.path));
            ytdlStream.on("progress", (chunkLength, downloaded, total) => {

                socket.emit("progress", ((downloaded / total) / 2 * 100).toFixed(2))
                console.log((downloaded / total).toFixed(2))
            });
            ytdlStream.on("error", (err) => {
                console.error("Error:", err);
            })

            ytdlStream.on("info", (info) => {
                console.log(info)
            })

            ytdlStream.on("end", () => {
                console.log("end")
            })
            ytdlStream.on("finish", async () => {


                const firstInfo = info;
                temp.open({suffix: ".wav"}, (err, info) => {
                    console.log(firstInfo.path)
                    console.log("EEEEE", info.path)
                    let cmd = ffmpeg(firstInfo.path)
                        .format("wav")
                        .setStartTime(start)
                        .duration(end - start)
                        .on("progress", (progress) => {
                            console.log("eee")
                            socket.emit("progress", 0.5 + (progress.percent / 2).toFixed(2))
                        })
                        .on("start", (commandLine) => {
                            console.log("Started: ", commandLine)
                        })
                        .on("error", (err) => {
                            console.error("Error: ", err)
                        })
                        .saveToFile(info.path)
                    // const ffstream = cmd.pipe()


                    cmd.on("data", (chunk) => {
                        console.log(chunk)
                    })


                    cmd.on('end', () => {
                        console.log("finished")
                        let random = require("crypto").randomBytes(16).toString("hex")
                        socket.emit("progress", 100)
                        socket.emit("done", random)

                        app.get("/api/download/" + random, async (req, res) => {
                            res.sendFile(info.path)
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            temp.cleanupSync()
                        })


                    });
                })
            })
        })


        // const ffmpeg = createFFmpeg({ log: true });
        // ffmpeg.load().then(() => {
        //     ffmpeg.FS("writeFile", "test.opus", stream);
        //     ffmpeg.run("-i", "test.opus", "output.wav");
        //     const data = ffmpeg.FS("readFile", "output.wav");
        //     const url = URL.createObjectURL(new Blob([data.buffer], { type: "audio/wav" }));
        //     socket.emit("done", url)
        // })
    })
});


app.post("/api/lookup", (req, res) => {
    // console.log(express.json())
    let url = req.body.url;
    console.log(url)
    ytdl.getInfo(url)
        .then(r => {
            res.send(r)
        });
})

server.listen(3000, () => {
    console.log('listening on *:3000');
});
