import { batch } from "solid-js"
import { fen_pos, initial_step_play_san, next_step_play_san, type FEN, type Path, type Step, type UCI } from "../components/step_types"
import { createStore } from "solid-js/store"
import { INITIAL_FEN } from "chessops/fen"
import { makeSan } from "chessops/san"
import { parseUci } from "chessops"

export type ReplayState = {
    list: Step[]
    cursor_path: Path
    fen: FEN
}

export type ReplayActions = {
    /*add_san(san: SAN): void*/
    add_uci_and_goto_it(uci: UCI): void
}


export function create_replay(): [ReplayState, ReplayActions] {

    let [state, set_state] = createStore<ReplayState>({
        list: [],
        cursor_path: '',
        get fen() {
            return this.list.find((_: Step) => _.path === this.cursor_path)?.fen ?? INITIAL_FEN
        },
    })

    let actions = {
        add_uci_and_goto_it(uci: UCI) {

            let list = state.list

            let pos = fen_pos(state.fen)
            let move = parseUci(uci)!
            let san = makeSan(pos, move)

            let new_step = list.length === 0 ?
                initial_step_play_san(san) :
                next_step_play_san(list[list.length - 1], san)

            batch(() => {
                set_state("list", state.list.length, new_step)
                set_state("cursor_path", new_step.path)
            })
        }
    }

    return [state, actions]
}