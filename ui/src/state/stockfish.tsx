import { createContext, createEffect, createSignal, on, useContext, type JSX } from "solid-js"
import type { FEN, UCI } from "../components/step_types"
import { protocol, type LocalEval } from "../ceval2/stockfish-module"
import { createAsync } from "@solidjs/router";
import { createStore } from "solid-js/store";
import throttle from "../common/throttle";
import { isAndroid, isIPad, isMobile } from "./device";

const gen_game_id = (() => { let i = 0; return () => `${i++}` })()

type Protocol = any

type GetProtocol = {
    downloaded_nb?: { total: number, bytes: number }
    engine_failed?: string
    protocol?: Protocol
}

function get_protocol(): GetProtocol {

    let [downloaded_nb, set_downloaded_nb] = createSignal<{ total: number, bytes: number } | undefined>(undefined)
    let [engine_failed, set_engine_failed] = createSignal<string | undefined>(undefined)

    let res = createAsync(() => protocol({
        on_downloaded_nb(_) {
            set_downloaded_nb(_)
        },
        on_engine_failed(_) {
            set_engine_failed(_)
        }
    }))


    return {
        get downloaded_nb() {
            return downloaded_nb()
        },
        get engine_failed() {
            return engine_failed()
        },
        get protocol() {
            return res()
        }
    }
}

function get_multipv(p: Protocol, fen: FEN): Promise<MultiPV> {
    
    let on_best_move: (_: MultiPV) => void

    let depth = 10
    let multi_pv = 7
    let ply = 0

    let threads = isMobile() ? 1 : Math.max(1, navigator.hardwareConcurrency - 2)
    let hash_size = (isAndroid() || isIPad()) ? 64 : 256

    let game_id = gen_game_id()

    p.start({
        threads,
        hash_size,
        game_id,
        stop_requested: false,
        swap_requested: false,
        path: [],
        search: {
            depth
        },
        multi_pv,
        ply,
        threatMode: false,
        initial_fen: fen,
        current_fen: fen,
        moves: [],
        emit: function (ev: LocalEval): void {
            on_best_move(ev.pvs.map(_ => ({
                uci: _.moves[0],
                cp: _.cp,
                mate: _.mate
            })))
        },
        on_pvs: throttle(200, function (_ev: LocalEval): void {
            //on_depth(ev)
        }),
    })

    return new Promise(resolve => {
        on_best_move = resolve
    })
}


export type PV = {
    uci: UCI,
    cp?: number
    mate?: number
}
export type MultiPV = PV[]

type Actions = {
    request_multipv(fen: FEN): void
}

type State = {
    downloaded_nb?: { total: number, bytes: number }
    engine_failed?: string
    pvs: Record<FEN, MultiPV>
}

type Store = [State, Actions]

export function StockfishProvider(props: { children: JSX.Element}) {

    let protocol_stuff = get_protocol()

    let pvs: Record<FEN, MultiPV> = {}

    let [state, set_state] = createStore<State>({
        get downloaded_nb() {
            return protocol_stuff.downloaded_nb
        },
        get engine_failed() {
            return protocol_stuff.engine_failed
        },
        pvs
    })

    let working = false
    let queue: FEN[] = []
    function check_queue() {
        if (!protocol_stuff.protocol) {
            return
        }
        if (working) {
            return
        }
        let fen = queue.shift()
        if (fen) {
            working = true
            get_multipv(protocol_stuff.protocol, fen).then(pvs => {
                set_state("pvs", fen, pvs)
                working = false
                check_queue()
            })
        }
    }

    createEffect(on(() => protocol_stuff.protocol, check_queue))

    let actions = {
        request_multipv(fen: FEN) {
            queue.push(fen)
            check_queue()
        }
    }

    let store: Store = [state, actions]


    return (<StoreContext.Provider value={store}>
        {props.children}
    </StoreContext.Provider>)

}

const StoreContext = createContext<Store>()

export function useStockfish() {
    return useContext(StoreContext)!
}