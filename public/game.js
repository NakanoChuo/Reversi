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
        this.log = [];  // ゲームログ（デバッグ用）

        let col, row;
        let prevTurnIsPassed = false;   // 前のターンがパスされたかどうか
        let diskCount = 0;
        while (true) {
            this.screen.showMessage(this.players[this.turn] instanceof Controller ? 'あなたの番です' : '相手が入力中です');

            // 配置可能なセルを計算
            let placeableMap = this.board.getPlaceableCells(this.turn);

            // 配置可能なセルの座標の配列
            let placeableCells = Object.keys(placeableMap)
                .filter(key => placeableMap[key].length > 0)
                .map(key => key.split(',').map(Number));
            
            if (placeableCells.length == 0) {       // 配置可能なセルがない場合、パス or ゲーム終了
                if (prevTurnIsPassed) { break; }    // 前のターンもパスしていた場合、ゲーム終了
                this.turn = Reversi.getReverseColor(this.turn); // パス
                prevTurnIsPassed = true;
                continue;
            } else {
                prevTurnIsPassed = false;
            }

            // 配置可能なセルの表示
            this.screen.showPlaceableCells(placeableCells);

            // プレイヤーの選択を待つ
            [col, row] = await this.players[this.turn].getChoice(col, row, this.board);

            let flipCells = placeableMap[`${col},${row}`];  // プレイヤーが選んだセルにコマを置いたとき、裏返されるコマの位置
            if (flipCells.length > 0) { // 1つでも裏返せるなら
                this.board.set(col, row, this.turn);    // コマを置き
                for (let [flipCol, flipRow] of flipCells) {
                    this.board.set(flipCol, flipRow, this.turn);    // 裏返していく
                }

                this.log.push([this.turn, col, row]);   // ゲームログの記録
                this.turn = Reversi.getReverseColor(this.turn); // 次のターンへ
                diskCount++;
                if (diskCount >= Reversi.COL_COUNT * Reversi.ROW_COUNT) {   // コマを全て置いたらゲーム終了
                    break;
                }
            }
        }
    }

    over() {
        // 黒色のコマと白色のコマの数を集計
        let counts = {}
        Object.keys(this.players).forEach(color => {counts[color] = this.board.countDisks(color)});
        if (counts[Reversi.BLACK] == counts[Reversi.WHITE]) {
            this.screen.showMessage('引き分け');
            return;
        }

        // 数の多い色
        let winColor = Object.keys(this.players)
            .sort((color1, color2) => counts[color2] - counts[color1])[0];
        
        this.screen.showMessage(this.players[winColor] instanceof Controller ? 'あなたの勝ち' : '相手の勝ち');
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
        this.isCalculatedPlaceable = {  // 配置可能なセルを既に計算しているかどうか
            [Reversi.BLACK]: false,
            [Reversi.WHITE]: false
        };
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
        this.isCalculatedPlaceable = {
            [Reversi.BLACK]: false,
            [Reversi.WHITE]: false
        };
    }

    countDisks(color) {
        return this.array2d
            .reduce((arr1, arr2) => arr1.concat(arr2), [])
            .filter(cell => cell == color)
            .reduce(sum => sum + 1, 0);
    }

    // コマを置くことができる位置を求める
    // 戻り値は連想配列であり、これは'<数値1>,<数値2>'の文字列のキーに対して、<数値1>列・<数値2>行にコマを置いたときに
    // 裏返されるコマの位置が格納されている
    getPlaceableCells(color) {
        if (this.isCalculatedPlaceable[color]) {    // 既に配置可能なセルが計算されていたなら
            return this.placeableMap;               // 再計算はせず、前の計算結果を返す
        }
        this.isCalculatedPlaceable[color] = true;

        this.placeableMap = {};
        for (let col of this.array2d.keys()) {
            for (let row of this.array2d[col].keys()) {
                this.placeableMap[`${col},${row}`] = this.countFlipCells(col, row, color);
            }
        }
        return this.placeableMap;
    }

    // col列、row行にcolorの色のコマを置いたときに裏返されるコマの位置の配列を返す
    countFlipCells(col, row, color) {
        if (this.get(col, row) != Reversi.NONE) { return []; }

        let flipCells = []; // 裏返されるコマの位置の配列
        // (col, row)周りの8方向について調べていく
        for (let dirCol of [-1, 0, 1]) {
            for (let dirRow of [-1, 0, 1]) {
                if (dirCol == 0 && dirRow == 0) { continue; }
                flipCells.push(...this.countFlipCellsRecursively(col, row, dirCol, dirRow, color));
            }
        }
        return flipCells;
    }

    // col列、row行にcolorの色のコマを置いたとき、(dirCol, dirRow)方向の直線上での裏返されるコマの位置の配列を返す
    countFlipCellsRecursively(col, row, dirCol, dirRow, color) {
        switch (this.get(col + dirCol, row + dirRow)) {
            case Reversi.NONE:
                return [];
            case color:
                if (this.get(col, row) == Reversi.getReverseColor(color)) {
                    return [[col, row]];
                } else {
                    return [];
                }
            default:
                let flipCells = this.countFlipCellsRecursively(col + dirCol, row + dirRow, dirCol, dirRow, color);
                if (flipCells.length > 0 && this.get(col, row) != Reversi.NONE) {
                    flipCells.push([col, row]);
                }
                return flipCells;
        }
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

    // 配置可能なセルを表示する
    showPlaceableCells(cells) {
        let elems = document.getElementsByClassName('cell');
        for (let elem of elems) {
            elem.classList.remove('placeable');
        }
        for (let [col, row] of cells) {
            document.getElementById(String(row * Reversi.COL_COUNT + col)).classList.add('placeable');
        }
    }
}
