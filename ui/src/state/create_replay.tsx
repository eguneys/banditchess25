import { batch } from "solid-js"
import { fen_pos, initial_step_play_san, next_step_play_san, type FEN, type Path, type SAN, type Step, type UCI } from "../components/step_types"
import { createStore } from "solid-js/store"
import { INITIAL_FEN } from "chessops/fen"
import { makeSan } from "chessops/san"
import { parseUci } from "chessops"

export type ReplayState = {
    list: Step[]
    cursor_path: Path
    fen: FEN
    last_move?: [UCI, SAN]
}

export type ReplayActions = {
    initialize_replay(sans: SAN[], cursor_path?: Path): void
    add_uci_and_goto_it(uci: UCI): Step
    set_cursor_path(path: Path): void
    goto_next_path_if_can(): void
    goto_prev_path_if_can(): void
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
        initialize_replay(sans: SAN[], cursor_path?: Path) {
            if (sans.length === 0) {
                batch(() => {
                    set_state("list", [])
                    set_state("cursor_path", '')
                    set_state("last_move", undefined)
                })
                return
            }
            let list: Step[] = []
            let step0 = initial_step_play_san(sans[0])

            list.push(step0)
            for (let i = 1; i < sans.length; i++) {
                step0 = next_step_play_san(step0, sans[i])
                list.push(step0)
            }

            cursor_path ??= step0.path

            let last_san = list.find(_ => _.path === cursor_path)!

            batch(() => {
                set_state("list", list)
                set_state("cursor_path", cursor_path)
                set_state("last_move", [last_san.uci, last_san.san])
            })

        },
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
                set_state("last_move", [new_step.uci, new_step.san])
            })
            return new_step
        },
        set_cursor_path(path: Path) {
            set_state('cursor_path', path)
        },
        goto_next_path_if_can() {

            let i = state.list.findIndex(_ => _.path === state.cursor_path)

            let next = state.list[i + 1]
            if (next) {
                set_state('cursor_path', next.path)
            }
        },
        goto_prev_path_if_can() {
            if (state.cursor_path.length > 0) {
                let prev_path = state.cursor_path.split(' ').slice(0, -1).join(' ')
                set_state('cursor_path', prev_path)
            }
        }
    }

    return [state, actions]
}