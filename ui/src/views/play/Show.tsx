import { batch, createComputed, createEffect, createMemo, createSignal, For, on, untrack } from 'solid-js'
import { non_passive_on_wheel, PlayUciBoard } from '../../components/PlayUciBoard'
import { useStore } from '../../state'
import { StockfishProvider, useStockfish, type MultiPV } from '../../state/stockfish'
import './Show.scss'
import type { Color, FEN, Key } from 'chessground/types'
import { fen_is_end, fen_pos, fen_turn, fen_winner, type Path, type SAN, type Step, type UCI } from '../../components/step_types'
import { makePersisted } from '@solid-primitives/storage'
import { createStore } from 'solid-js/store'
import { MeetButton } from '../../components/MeetButton'
import { useNavigate } from '@solidjs/router'
import { arr_rnd, rnd_sign } from '../../game/random'
import { opposite, parseSquare } from 'chessops'

export default function() {

    return (<>
    <StockfishProvider>
        <WithStockfish/>
    </StockfishProvider>
    </>)
}

type GameResultType = 'game-ended'
type GameResult = [GameResultType, Color | undefined]

type StockfishVSSave = {
    nth: number
    sans: SAN[]
    cursor_path: Path
    game_result: GameResult | undefined
    deltas: number[]
    color: Color
    scores: {
        white: Score,
        black: Score
    } 
}

type Score = {
    classic: number
    combo: number
    streak: number
    streak_delta?: number
    classic_delta?: number
    combo_delta?: number
}


function WithStockfish() {

    let [stockfish, { request_multipv }] = useStockfish()


    const downloaded_nb = () => stockfish.downloaded_nb
    const engine_failed = () => stockfish.engine_failed

    createEffect(() => {
        console.log(downloaded_nb())
    })

    createEffect(() => {
        console.log(engine_failed())
    })

    let [state, {
        initialize_replay, 
        add_uci_and_goto_it, 
        set_cursor_path,
        goto_next_path_if_can,
        goto_prev_path_if_can
    }] = useStore()

    const [persist_state, set_persist_state] = makePersisted(createStore<StockfishVSSave>({
        color: rnd_sign() ? 'white': 'black',
        nth: 1,
        sans: [],
        deltas: [],
        cursor_path: '',
        game_result: undefined,
        scores: {
            white: { classic: 0, combo: 0, streak: 0 },
            black: { classic: 0, combo: 0, streak: 0 }
        }
    }), {
        name: '.banditchess.vs_stockfish_save.v2'
    })

    const nth = () => persist_state.nth

    function add_persist_step(step: Step) {
        set_persist_state("sans", persist_state.sans.length, step.san)
        set_persist_state("cursor_path", step.path)
    }


    const color = () => persist_state.color
    const engine_color = () => opposite(color())

    const movable = () => persist_state.game_result === undefined

    const steps = createMemo(() => state.replay.list)

    const fen = createMemo(() => state.replay.fen)
    const last_move = createMemo(() => state.replay.last_move)

    const [last_fen_request, set_last_fen_request] = createSignal<FEN | undefined>(undefined)
    const [last_user_step, set_last_user_step] = createSignal<Step | undefined>(undefined)


    initialize_replay(persist_state.sans, persist_state.cursor_path)

    const handle_last_pv_request = (fpvs: [FEN, MultiPV] | undefined) => {
        if (!fpvs) {
            return
        }

        untrack(() => {
            set_last_fen_request(undefined)
        })

        let [fen, pvs] = fpvs

        let f_color = fen_turn(fen)

        if (f_color !== persist_state.color) {
            let pv = select_engine_pv(pvs)

            let engine_score = score_pv(pvs, pv.uci)
            add_score(engine_color(), engine_score)

            let step = add_uci_and_goto_it(pv.uci)
            add_persist_step(step)


            request_next_fen_or_end_the_game(step.fen)
        } else {
            check_and_add_user_score()
        }
    }

    function check_and_add_user_score() {
        let step = last_user_step()

        if (!step) {
            return
        }

        set_last_user_step(undefined)

        let pvs = stockfish.pvs[step.before_fen]

        if (!pvs) {
            return
        }

        let user_score = score_pv(pvs, step.uci)
        add_score(color(), user_score)
    }

    const score_add_skip_opening = createMemo(() => state.replay.list.length < 5 * 2)

    const add_score = (color: Color, score: number) => {

        if (score_add_skip_opening()) {
            return
        }

        let old_streak = persist_state.scores[color].streak
        if (score === 0) {
            set_persist_state("scores", color, "streak", 0)
        } else {
            set_persist_state("scores", color, "streak", _ => _ + 1)
        }

        let streak = persist_state.scores[color].streak

        if (combo(streak) !== combo(old_streak)) {
            set_persist_state("scores", color, "streak_delta", combo(streak) - combo(old_streak))
        }

        if (score > 0) {
            set_persist_state("scores", color, "classic_delta", score)
            set_persist_state("scores", color, "combo_delta", score * combo(streak))
        }

        set_persist_state("scores", color, "classic", persist_state.scores[color].classic + score)
        set_persist_state("scores", color, "combo", persist_state.scores[color].combo + score * combo(streak))


        setTimeout(() => {
            set_persist_state("scores", color, "classic_delta", undefined)
            set_persist_state("scores", color, "combo_delta", undefined)
            set_persist_state("scores", color, "streak_delta", undefined)
        }, 200)
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

        { // uci auto promote to queen
            let position = fen_pos(fen())
            let turn_color = position.turn
            let piece = position.board.get(parseSquare(orig)!)!
            if (piece.role === 'pawn' &&
                ((dest[1] === '8' && turn_color === 'white') || (dest[1] === '1' && turn_color === 'black'))) {
                uci += 'q'
            }
        }

        let step = add_uci_and_goto_it(uci)
        add_persist_step(step)

        set_last_user_step(step)
        check_and_add_user_score()

        request_next_fen_or_end_the_game(state.replay.fen)

    }

    const request_next_fen_or_end_the_game = (fen: FEN) => {
        if (fen_is_end(state.replay.fen)) {
            let result: GameResult = ['game-ended', fen_winner(state.replay.fen)]
            set_persist_state('game_result', result)
        } else {
            set_last_fen_request(fen)
            request_multipv(fen)
        }
    }

    const reset_persistence = () => {
        batch(() => {
            set_persist_state('color', opposite(persist_state.color))
            set_persist_state('game_result', undefined)
            set_persist_state("nth", _ => _ + 1)
            set_persist_state("sans", [])
            set_persist_state("cursor_path", '')

            initialize_replay([], '')
            request_next_fen_or_end_the_game(fen())

            set_persist_state("scores", "white", { classic: 0, combo: 0, streak: 0 })
            set_persist_state("scores", "black", { classic: 0, combo: 0, streak: 0 })
        })
    }

    const on_restart = () => {
        reset_persistence()
    }

    let navigate = useNavigate()
    const on_go_home = () => {
        reset_persistence()
        navigate('/')
    }

    const set_on_wheel = (i: number) => {
        if (i > 0) {
            goto_next_path_if_can()
        } else {
            goto_prev_path_if_can()
        }
    }


    request_next_fen_or_end_the_game(fen())

    return (<>
    <main class='vs'>
        <div class='background'>
            <div class='p1'></div>
            <div class='p2'></div>
        </div>
        <div class='content'>
            <div class='info'>
                <h3>Bandit vs Stockfish</h3>
                <span>Match #{nth()}</span>
            </div>
            <div on:wheel={non_passive_on_wheel(set_on_wheel)} class='board-wrap'>
                <div class='board'>
                    <PlayUciBoard orientation={color()} movable={movable()} color={color()} fen={fen()} last_move={last_move()} play_orig_key={on_play_orig_key} />
                </div>
            </div>
            <div class='replay-wrap'>
                <div class='top-padding'></div>
                <div class='user-top'>
                    <span class='user ai'>Stockfish</span>
                    <span class='time'>0:00</span>
                </div>
                <div class='replay'>
                    <ReplaySingle onSetCursorPath={set_cursor_path} cursor_path={state.replay.cursor_path} steps={steps()} />
                    <div class='scores'>
                        <ScoreDelta small={color()==="black"} flip={true} skip={score_add_skip_opening()} {...persist_state.scores.white} />
                        <ScoreDelta small={color()==="white"} flip={false} skip={score_add_skip_opening()} {...persist_state.scores.black} />
                    </div>
                </div>
                <div class="controls">
                    <MeetButton meet={true} onClick={on_restart}>Restart</MeetButton>
                    <MeetButton meet={true} onClick={on_go_home}>Go Home</MeetButton>
                </div>
                <div class='user-bottom'>
                    <span class='user'>You</span>
                    <span class='time'>0:00</span>
                </div>
                <div class='bottom-padding'></div>
            </div>
            <div class='history'>
            </div>
        </div>

    </main>
    </>)
}

const combo = (streak: number) => streak > 2 ? 4 : streak > 1 ? 3 : 2
function ScoreDelta(props: { small: boolean, flip: boolean, skip: boolean, classic: number, streak: number, combo: number, streak_delta?: number, classic_delta?: number, combo_delta?: number }) {

    return (<>
        <div classList={{flip: props.flip, small: props.small }} class='score-delta'>
            <span classList={{ skip: props.skip, bump: props.classic_delta !== undefined }} class='score'>{props.classic}</span>
            <div classList={{ skip: props.skip }} class='combo-streak'>
                <span classList={{ bump: props.streak_delta !== undefined && props.streak_delta > 0, shoot: props.streak_delta !== undefined && props.streak_delta < 0 }} class='streak'>x{combo(props.streak)}</span>
                <span classList={{ bump: props.combo_delta !== undefined }} class='combo'>{props.combo}</span>
            </div>
        </div>
    </>)
}

function select_engine_pv(pv: MultiPV) {
    let top_cp = pv[0].cp
    if (!top_cp) {
        return pv[0]
    }

    let aa = pv.filter(_ => _.cp && Math.abs(_.cp) - Math.abs(top_cp) < 10)
    let bb = pv.filter(_ => _.cp && Math.abs(_.cp) - Math.abs(top_cp) < 20)
    let cc = pv.filter(_ => _.cp && Math.abs(_.cp) - Math.abs(top_cp) < 60)
    let dd = pv.filter(_ => _.cp && Math.abs(_.cp) - Math.abs(top_cp) >= 60)


    let a0 = arr_rnd(aa)
    let b0 = arr_rnd(bb)
    let c0 = arr_rnd(cc)
    let d0 = arr_rnd(dd)

    let res = []

    if (a0) {
        res.push(a0)
        res.push(a0)
        res.push(a0)
        res.push(a0)
    }
    if (b0) {
        res.push(b0)
        res.push(b0)
        res.push(b0)
    }
    if (c0) {
        res.push(c0)
        res.push(c0)
    }
    if (d0) {
        res.push(d0)
        if (rnd_sign()) {
            res.push(d0)
            res.push(d0)
            res.push(d0)
        }
    }

    return arr_rnd(res)
}

function score_pv(pvs: MultiPV, uci: UCI) {
    let i = pvs.findIndex(_ => _.uci === uci)
    if (i === -1) {
        return 0
    }
    return pvs.length - i - 1
}

function ReplaySingle(props: { onSetCursorPath: (path: Path) => void, cursor_path: Path, steps: Step[] }) {


    let $moves_el: HTMLDivElement
    createEffect(() => {

        let cursor_path = props.cursor_path
        let cont = $moves_el.parentElement
        if (!cont) {
            return
        }

        const target = $moves_el.querySelector<HTMLElement>('.on-path-end')
        if (!target) {
            cont.scrollTop = cursor_path.length > 0 ? 99999 : 0
            return
        }

        let top = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight
        cont.scrollTo({ behavior: 'smooth', top })
    })


    return (<>
        <div class='list-wrap'>
            <div ref={el => { $moves_el = el }} class='list'>
                <For each={props.steps}>{step =>
                    <span onClick={() => props.onSetCursorPath(step.path)} classList={{ 'on-path-end': step.path === props.cursor_path }} class='step'>{step.ply % 2 === 1 ? ply_to_index(step.ply) : ''} {step.san} </span>
                }</For>
            </div>
        </div>
        <div class='padding'></div>
    </>)
}

export const ply_to_index = (ply: number) => {
    let res = Math.ceil(ply / 2)
    return `${res}.` + (ply % 2 === 0 ? '..' : '')
}