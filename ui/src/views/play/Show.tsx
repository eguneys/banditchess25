import { createComputed, createEffect, createMemo, createSignal, For, on, untrack } from 'solid-js'
import { PlayUciBoard } from '../../components/PlayUciBoard'
import { useStore } from '../../state'
import { StockfishProvider, useStockfish, type MultiPV } from '../../state/stockfish'
import './Show.scss'
import type { Color, FEN, Key } from 'chessground/types'
import { fen_turn, type Path, type SAN, type Step } from '../../components/step_types'
import { makePersisted } from '@solid-primitives/storage'
import { createStore } from 'solid-js/store'
import { MeetButton } from '../../components/MeetButton'
import { useNavigate } from '@solidjs/router'

export default function() {

    return (<>
    <StockfishProvider>
        <WithStockfish/>
    </StockfishProvider>
    </>)
}

type StockfishVSSave = {
    sans: SAN[],
    cursor_path: Path
}

function WithStockfish() {

    const nth = () => 1

    let [stockfish, { request_multipv }] = useStockfish()


    const downloaded_nb = () => stockfish.downloaded_nb
    const engine_failed = () => stockfish.engine_failed

    createEffect(() => {
        console.log(downloaded_nb())
    })

    createEffect(() => {
        console.log(engine_failed())
    })


    let [state, {initialize_replay, add_uci_and_goto_it}] = useStore()

    const [persist_state, set_persist_state] = makePersisted(createStore<StockfishVSSave>({
        sans: [],
        cursor_path: ''
    }), {
        name: '.banditchess.vs_stockfish_save.v0'
    })

    function add_persist_step(step: Step) {
        set_persist_state("sans", persist_state.sans.length, step.san)
        set_persist_state("cursor_path", step.path)
    }

    initialize_replay(persist_state.sans, persist_state.cursor_path)

    const movable = () => true

    const steps = createMemo(() => state.replay.list)

    const [color, _set_color] = createSignal<Color>('white')

    const fen = createMemo(() => state.replay.fen)
    const last_move = createMemo(() => state.replay.last_move)

    const [last_fen_request, set_last_fen_request] = createSignal<FEN | undefined>(undefined)

    const handle_last_pv_request = (fpvs: [FEN, MultiPV] | undefined) => {
        if (!fpvs) {
            return
        }

        untrack(() => {
            set_last_fen_request(undefined)
        })

        let [fen, pvs] = fpvs

        let f_color = fen_turn(fen)

        console.log(fen, pvs)
        if (f_color !== color()) {

            let pv = select_engine_pv(pvs)

            let step = add_uci_and_goto_it(pv.uci)
            add_persist_step(step)
        }
    }
    createComputed(on(() => {
        let fen = last_fen_request()
        if (!fen) {
            return undefined
        }
        let pvs = stockfish.pvs[fen]
        if (!pvs) {
            return undefined
        }

        let res: [FEN, MultiPV] = [fen, pvs]
        return res
    }, handle_last_pv_request))


    const on_play_orig_key = (orig: Key, dest: Key) => {

        let uci = orig + dest

        let step = add_uci_and_goto_it(uci)
        add_persist_step(step)

        set_last_fen_request(state.replay.fen)
        request_multipv(state.replay.fen)
    }

    const reset_persistence = () => {
        set_persist_state("sans", [])
        set_persist_state("cursor_path", '')

        initialize_replay([], '')
    }

    const on_restart = () => {
        reset_persistence()
    }

    let navigate = useNavigate()
    const on_go_home = () => {
        reset_persistence()
        navigate('/')
    }

    return (<>
    <main class='vs'>
        <div class='info'>
            <h3>Bandit vs Stockfish</h3>
            <span>Match #{nth()}</span>
        </div>
        <div class='board-wrap'>
            <div class='board'>
            <PlayUciBoard movable={movable()} color={color()} fen={fen()} last_move={last_move()} play_orig_key={on_play_orig_key}/>
            </div>
        </div>
        <div class='replay-wrap'>
            <div class='user-top'>
                <span class='user ai'>Stockfish</span>
                <span class='score'>0</span>
                <span class='score'>x2 0</span>
                <span class='time'>0:00</span>
            </div>
            <div class='replay'>
                <ReplaySingle steps={steps()}/>
            </div>
            <div class="controls">
                <MeetButton meet={true} onClick={on_restart}>Restart</MeetButton>
                <MeetButton meet={true} onClick={on_go_home}>Go Home</MeetButton>
            </div>
            <div class='user-bottom'>
                <span class='user'>You</span>
                <span class='score'>0</span>
                <span class='score'>x2 0</span>
                <span class='time'>0:00</span>
            </div>
        </div>
        <div class='history'>
            History
        </div>
    </main>
    </>)
}

function select_engine_pv(pv: MultiPV) {
    return pv[0]
}

function ReplaySingle(props: { steps: Step[] }) {

    return (<>
        <div class='replay'>
            <For each={props.steps}>{step =>
                <span class='step'>{ply_to_index(step.ply)} {step.san} </span>
            }</For>
        </div>
    </>)
}

export const ply_to_index = (ply: number) => {
    let res = Math.ceil(ply / 2)
    return `${res}.` + (ply % 2 === 0 ? '..' : '')
}