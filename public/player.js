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

// 弱いAIクラス
// 盤面を見て最も多くのコマを裏返せる場所を指す
class WeakComputer extends Player {
    getChoice(oppositeCol, oppositeRow, board) {
        let placeableMap = board.getPlaceableCells(this.color);
        let maxCell;
        Object.keys(placeableMap)
            .forEach(cell => {
                if (maxCell === undefined || placeableMap[maxCell].length < placeableMap[cell].length) {
                    maxCell = cell;
                }
            });
        return new Promise(resolve => {
            setTimeout(() => resolve(maxCell.split(',').map(Number)), 1000);
        });
    }
}