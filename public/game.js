// ゲームを管理＆ゲームロジック部分を担当
class Reversi {
    // 定数
    static get COL_COUNT() { return 8; }
    static get ROW_COUNT() { return 8; }
    static get NONE() { return 'none'; }
    static get BLACK() { return 'black'; }
    static get WHITE() { return 'white'; }

    static getReverseColor(color) {
        if (![Reversi.BLACK, Reversi.WHITE].includes(color)) { return Reversi.NONE; }
        return (color == Reversi.BLACK) ? Reversi.WHITE : Reversi.BLACK;
    }

    constructor() {
        this.screen = new Screen();
        this.board = new Board(this.screen);
        this.board.initialize();
    }

    setPlayers(player1, player2) {
        this.players = {
            [Reversi.BLACK]: player1,
            [Reversi.WHITE]: player2
        };
        for (let color in this.players) {
            this.players[color].initialize(color);
        }
    }

    async play() {
        this.turn = Reversi.BLACK;
        let col, row;
        while (true) {
            this.screen.showMessage(`${this.turn == Reversi.BLACK ? '黒' : '白'}の手番`);

            [col, row] = await this.players[this.turn].getChoice(col, row, this.board);

            if (this.board.putDisk(col, row, this.turn)) {
                this.turn = Reversi.getReverseColor(this.turn);
            }
        }
    }
}

// 盤面の状態を保持
class Board {
    constructor(screen) {
        this.array2d = new Array(Reversi.COL_COUNT);
        for (let i = 0; i < Reversi.COL_COUNT; i++) {
            this.array2d[i] = new Array(Reversi.ROW_COUNT);
        }
        this.screen = screen;
    }

    initialize() {
        for (let arr of this.array2d) {
            arr.fill(Reversi.NONE);
        }
        // 初期配置
        this.set(3, 3, Reversi.BLACK);
        this.set(3, 4, Reversi.WHITE);
        this.set(4, 3, Reversi.WHITE);
        this.set(4, 4, Reversi.BLACK);
    }

    checkValidIndices(col, row) {
        return 0 <= col && col < Reversi.COL_COUNT && 0 <= row && row < Reversi.ROW_COUNT;
    }

    get(col, row) {
        return this.checkValidIndices(col, row) ? this.array2d[col][row] : Reversi.NONE;
    }

    set(col, row, color) {
        if (![Reversi.BLACK, Reversi.WHITE].includes(color)) { return; }
        if (!this.checkValidIndices(col, row)) { return; }
        this.screen.update(col, row, this.array2d[col][row], color);    // Screenオブジェクトに画面更新を指示
        this.array2d[col][row] = color;
    }

    putDisk(col, row, color) {
        this.hasFlipped = false;    // flipDiskRecursivelyメソッドでコマを裏返したかどうかを記録
        if (this.get(col, row) != Reversi.NONE) { return; }

        // 8方向について裏返せるなら裏返していく
        for (let dirCol of [-1, 0, 1]) {
            for (let dirRow of [-1, 0, 1]) {
                if (dirCol == 0 && dirRow == 0) { continue; }
                this.flipDiskRecursively(col, row, dirCol, dirRow, color);
            }
        }
        if (this.hasFlipped) {
            // コマが裏返せるなら、その場所に置けるため置く
            this.set(col, row, color);
        }

        return this.hasFlipped;
    }

    // (dirCol, dirRow)の方向に裏返せるなら裏返していく
    // colorは初めに置いたコマの色
    flipDiskRecursively(col, row, dirCol, dirRow, color) {
        col += dirCol;
        row += dirRow;
        if (this.get(col, row) == Reversi.NONE) { return false; }
        if (this.get(col, row) == color) { return true; }
        if (
            this.get(col, row) == Reversi.getReverseColor(color)      // 現在注目しているコマが、初めに置いたコマと違う色
            && this.flipDiskRecursively(col, row, dirCol, dirRow, color)    // かつ、その先に初めに置いたコマと同じ色のコマがある場合
        ) {
            this.set(col, row, color);                                // 現在注目しているコマを裏返す。
            this.hasFlipped = true;
            return true;
        }
        return false;
    }
}

// HTMLを編集して表示する画面に表示
class Screen {
    constructor() {
        this.createElements();
    }

    createElements() {
        let cell = document.getElementById("0");    // 1マス分のHTML要素を8x8個に複製
        for (let i = 1; i < Reversi.COL_COUNT * Reversi.ROW_COUNT; i++) {
            let newCell = cell.cloneNode(true);
            newCell.id = String(i);
            cell.after(newCell);
            cell = newCell;
        }
    }

    // (col, row)のマスの描画を更新
    update(col, row, prevColor, color) {
        const cell = document.getElementById(String(row * Reversi.COL_COUNT + col));
        if (prevColor === Reversi.NONE) {
            cell.className = `cell ${color}`;
        } else {
            // cell.className = `cell ${color} flipped`だけだと
            // コマを裏返すCSSアニメーションが一度（flippedが追加されたとき）だけしか実行されない
            // そのため、一度flippedをクラスから外し、flippedを追加して再描画させる必要がある。
            // 参考：https://developer.mozilla.org/ja/docs/Web/CSS/CSS_animations/Tips#再度アニメーションを実行する
            cell.className = `cell ${prevColor}`;
            window.requestAnimationFrame(function(time) {
                window.requestAnimationFrame(function(time) {
                    cell.className = `cell ${color} flipped`;
                });
            });
        }
    }

    showMessage(message) {
        document.getElementById('message').innerText = message;
    }
}

// 入力を受け取るクラス
class Player {
    initialize(color) {
        this.color = color;
    };

    getChoice(prevCol, prevRow, board) {
        throw Error(`${this.getChoice.name} is not implemented.`);
    }
}

// 画面からの入力を受け取る
class Controller extends Player {
    constructor() {
        super();
        this.onClick = () => {};
        for (let cell of document.getElementsByClassName('cell')) {
            cell.addEventListener('click', event => {
                const cell = event.currentTarget;
                const col = Number(cell.id) % Reversi.COL_COUNT;
                const row = Math.floor(Number(cell.id) / Reversi.COL_COUNT);
                this.onClick([col, row]);
            });
        }
    }

    getChoice() {
        return new Promise(resolve => {
            this.onClick = resolve;
        });
    }
}