import { createEffect, createMemo, For } from 'solid-js'
import { PlayUciBoard } from '../../components/PlayUciBoard'
import { useStore } from '../../state'
import { StockfishProvider, useStockfish } from '../../state/stockfish'
import './Show.scss'
import type { Key } from 'chessground/types'
import type { Step } from '../../components/step_types'

export default function() {

    return (<>
    <StockfishProvider>
        <WithStockfish/>
    </StockfishProvider>
    </>)
}

function WithStockfish() {

    let [stockfish, { request_multipv }] = useStockfish()


    const downloaded_nb = () => stockfish.downloaded_nb
    const engine_failed = () => stockfish.engine_failed
    const pvs = createMemo(() => stockfish.pvs)

    createEffect(() => {
        console.log(downloaded_nb())
    })

    createEffect(() => {
        console.log(engine_failed())
    })
    createEffect(() => {
        console.log(pvs())
    })



    let [state, {add_uci_and_goto_it}] = useStore()

    const fen = createMemo(() => state.replay.fen)

    const nth = () => 1

    const on_play_orig_key = (orig: Key, dest: Key) => {

        let uci = orig + dest

        add_uci_and_goto_it(uci)

        request_multipv(state.replay.fen)
    }

    const movable = () => true

    const steps = createMemo(() => state.replay.list)

    return (<>
    <main class='vs'>
        <div class='info'>
            <h3>Bandit vs Stockfish</h3>
            <span>Match #{nth()}</span>
        </div>
        <div class='board-wrap'>
            <div class='board'>
            <PlayUciBoard movable={movable()} color="white" fen={fen()} last_move={undefined} play_orig_key={on_play_orig_key}/>
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