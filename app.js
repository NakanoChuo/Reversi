const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 3000;

app.use('/', express.static(`${__dirname}/public`));

// '/'にクライアントがアクセスしたとき
app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/game.html`);
});

http.listen(port, ()=>{
    console.log(`Server listening on port:${port}.`);
});