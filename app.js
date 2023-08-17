const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 3000;
let rooms = {}; // オンライン対戦用の部屋

app.use('/', express.static(`${__dirname}/public`));
app.use('/', express.urlencoded({ extended: true }));

// '/'にクライアントがアクセスしたとき
app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/index.html`);    // ゲームモード選択画面を返す
});

// ゲームモード選択画面でフォーム入力後
app.post('/', (req, res) => {
    switch (req.body.gamemode) {
        case 'online':  // オンライン対戦
            let roomName;
            do {
                roomName = Math.random().toString(36).slice(-10);
            } while (roomName in rooms);
            rooms[roomName] = [];   // 部屋を新規作成
            res.redirect(`/online/${roomName}`);
            break;
        case 'cpu':     // CPU対戦
            res.redirect('/cpu');
            break;
        case 'debug':   // デバッグ用
            res.redirect('/debug');
            break;
        default:
            res.status(404).send();
            break;
    }
});

// オンライン対戦
app.get('/online/:roomName', (req, res) => {
    if (req.params.roomName in rooms) {
        res.sendFile(`${__dirname}/game.html`);
    } else {
        res.status(404).send();
    }
});

// CPU対戦
app.get('/cpu', (req, res) => {
    res.sendFile(`${__dirname}/game.html`);
});

// デバッグ用
app.get('/debug', (req, res) => {
    res.sendFile(`${__dirname}/game.html`);
});

// 上記のどのURLにも該当しない場合、404
app.use('/', (req, res) => {
    res.status(404).send();
});

http.listen(port, ()=>{
    console.log(`Server listening on port:${port}.`);
});