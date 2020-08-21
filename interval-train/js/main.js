class Board {
    constructor(container) {
        this.container = $(container)
        this.build()
        this.canvas = this.container.children('canvas')[0]
        this.question_area = this.container.children('.question')

        this.width = 8
        this.height = 6
        this.margin = 0
        this.root_color = '#DCEBF8'
        this.yes_color = '#A7D6BB'
        this.no_color = '#FA9B9B'
        this.front_color = '#6F7C85'

        this.canvas.width = this.container.width()
        this.canvas.height = this.canvas.width / (16 / 9)
        this.cell_height = this.canvas.height / (this.height + 2 * this.margin)
        this.cell_width = this.canvas.width / (this.width + 2 * this.margin)
        this.drawBoard()
    }
    clear() {
        const ctx = this.canvas.getContext("2d")
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.drawBoard()
    }
    drawBoard() {
        // draw horizon lines
        for (var i = 1; i <= this.height + 2 * this.margin; i++) {
            this.drawLine(0, (i - 0.5) * this.cell_height, this.canvas.width, (i - 0.5) * this.cell_height)
        }
        // draw vertical lines
        for (i = 1; i < this.width + 2 * this.margin; i++) {
            this.drawLine(i * this.cell_width, 0, i * this.cell_width, this.canvas.height)
        }
    }
    drawLine(x1, y1, x2, y2) {
        const ctx = this.canvas.getContext("2d")
        ctx.strokeStyle = this.front_color
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    }
    highlight(row, col, color) {
        const x = (col + this.margin + 0.5) * this.cell_width
        const y = (row + this.margin + 0.5) * this.cell_height
        this.drawCircle(x, y, this.cell_height / 2, color)
    }
    drawNote(row, col, note) {
        const ctx = this.canvas.getContext("2d")
        const height = this.cell_height * .7
        ctx.font = `${height}px serif`
        ctx.textBaseline = 'middle'
        ctx.fillStyle = this.front_color
        const width = ctx.measureText(note).width
        const x = (col + this.margin + 0.5) * this.cell_width - width / 2
        const y = (row + this.margin + 0.5) * this.cell_height
        ctx.fillText(note, x, y)
    }
    drawRect(x, y, w, h, c) {
        const ctx = this.canvas.getContext("2d")
        ctx.fillStyle = c
        ctx.fillRect(x, y, w, h)
    }
    drawCircle(x, y, r, c) {
        const ctx = this.canvas.getContext("2d")
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
    }
    showQuestion(text) {
        this.question_area.text(text)
    }
    xyToPosition(x, y) {
        return [
            Math.floor(y / this.cell_height - this.margin),
            Math.floor(x / this.cell_width - this.margin)
        ]
    }
    click(cb_func) {
        $(this.canvas).click(function(event) {
            const rect = this.canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            if(x > this.margin * this.cell_width
                && x < (this.width + this.margin) * this.cell_width
                && y > this.margin * this.cell_height
                && y < (this.height + this.margin) * this.cell_height) {
                cb_func(x, y)
            }
        }.bind(this))
    }
    build() {
        this.container.css({
            'width': '100%',
            'max-width': '400px',
            'margin': '0 auto'
        })
      this.container.append($('<div class="question"></div>'))
      this.container.append($('<canvas></canvas>'))
    }
}


class IntervalGame {
    constructor(board) {
        this.board = board
        this.root_note = '1'
        this.root_note_position = [[3, 3]]
        this.notes = ['1', 'b3', '4', '5', 'b7']
        this.position = [
            [[0, 0], [1, 5], [5, 1], [6, 6]],  // 1
            [[2, 1], [3, 6], [5, 4]],  // b3
            [[2, 3], [4, 1], [5, 6]],  // 4
            [[1, 0], [2, 5], [4, 3]],  // 5
            [[1, 3], [3, 1], [4, 6]]  // b7
        ]
        this.state = null
        this.initState()

        this.hint_btn = $('<button>Hint</buttom>')
        this.hint_btn.click(function() {
            this.drawAllNotes()
        }.bind(this))

        this.run()
    }
    initState() {
        this.state = {
            note: null,
            row_offset: 0,
            question: [],
            answer: [],
        }
    }
    clear() {
        this.board.clear()
        this.board.question_area.empty()
        this.initState()
    }
    run() {
        this.board.click(function(x, y) {
            var pos = this.board.xyToPosition(x, y)
            this.click(pos[0], pos[1])
        }.bind(this))
        this.clear()
        this.next()
    }
    click(row, col) {
        const pos = this.fretboardToPosition(row, col)
        const note = this.positionToNote(pos[0], pos[1])
        if(note === undefined) {
            this.board.highlight(row, col, this.board.no_color)
            return
        }

        // store answer
        this.state.answer.push(pos)

        // draw answer
        if(note === this.state.note) {
            if(note === this.root_note) {
                this.board.highlight(row, col, this.board.root_color)
            } else {
                this.board.highlight(row, col, this.board.yes_color)
            }
        } else {
            this.board.highlight(row, col, this.board.no_color)
        }
        this.board.drawNote(row, col, note)

        this.next()
    }
    next() {
        if(!this.state.note) {
            // start new round
            this.state.row_offset = Math.floor(Math.random() * this.board.height) - this.root_note_position[0][0]
            this.state.note = this.randomNote()
            this.state.question = this.removeOutsidePosition(this.positionOfNote(this.state.note))
            this.state.answer = []
            this.board.question_area.text('Find all ' + this.state.note + '.')
            this.board.question_area.append(this.hint_btn)
            this.drawRootNotes()
        }

        // check if answered all
        var correct = 0
        for(var i = 0; i < this.state.answer.length; i++) {
            for(var j = 0; j < this.state.question.length; j++) {
                if(this.state.answer[i][0] === this.state.question[j][0] &&
                    this.state.answer[i][1] === this.state.question[j][1]) {
                    correct++
                }
            }
        }
        if(correct === this.state.question.length) {
            // Correct. Round end.
            this.board.question_area.text('Right!')
            setTimeout(function() {
                this.clear()
                this.next()
            }.bind(this), 500);
        }
    }
    randomNote() {
        return this.notes[Math.floor(Math.random() * this.notes.length)]
    }
    positionOfNote(note) {
        var i = this.notes.indexOf(note)
        if(i === -1) {
            return []
        }
        return this.position[i].slice()
    }
    positionToNote(row, col) {
        for (var i = 0; i < this.position.length; i++) {
            for(var j = 0; j < this.position[i].length; j++) {
                if(row === this.position[i][j][0]
                    && col === this.position[i][j][1]) {
                    return this.notes[i]
                }
            }
        }
    }
    positionToFretboard(row, col) {
        const _row = row + this.state.row_offset
        const _col = (_row < 2) ? col + 1 : col
        return [_row, _col]
    }
    fretboardToPosition(row, col) {
        const _row = row - this.state.row_offset
        const _col = (row < 2) ? col - 1 : col
        return [_row, _col]
    }
    drawRootNotes() {
        for (var i = 0, len = this.root_note_position.length; i < len; i++) {
            const fretboard_pos = this.positionToFretboard(this.root_note_position[i][0], this.root_note_position[i][1])
            var row = fretboard_pos[0], col = fretboard_pos[1]
            this.board.highlight(row, col, this.board.root_color)
            this.board.drawNote(row, col, this.root_note)
        }
    }
    drawAllNotes() {
        for (var i = 0; i < this.notes.length; i++) {
            const note = this.notes[i]
            const note_position = this.removeOutsidePosition(this.position[i])
            for (var j = 0; j < note_position.length; j++) {
                const fretboard_pos = this.positionToFretboard(note_position[j][0], note_position[j][1])
                this.board.drawNote(fretboard_pos[0], fretboard_pos[1], note)
            }
        }
    }
    removeOutsidePosition(position) {
        var _position = []
        for (var i = 0, len = position.length; i < len; i++) {
            const fretboard_pos = this.positionToFretboard(position[i][0], position[i][1])
            if(fretboard_pos[0] < 0
                || fretboard_pos[0] >= this.board.height
                || fretboard_pos[1] < 0
                || fretboard_pos[1] >= this.board.width) {
                continue
            }
            _position.push(position[i])
        }
        return _position
    }
}


const board = new Board('.interval-train-container')
new IntervalGame(board)
