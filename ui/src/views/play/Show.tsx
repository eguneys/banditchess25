import { batch, children, createComputed, createEffect, createMemo, createSignal, For, type JSX, on, Show } from 'solid-js'
import { non_passive_on_wheel, PlayUciBoard } from '../../components/PlayUciBoard'
import { useStore } from '../../state'
import { StockfishProvider, useStockfish, type MultiPV } from '../../state/stockfish'
import './Show.scss'
import type { Color, FEN, Key } from 'chessground/types'
import { fen_is_end, fen_is_over_40, fen_pos, fen_turn, fen_winner, type Path, type SAN, type Step, type UCI } from '../../components/step_types'
import { makePersisted } from '@solid-primitives/storage'
import { createStore, reconcile } from 'solid-js/store'
import { MeetButton } from '../../components/MeetButton'
import { useNavigate } from '@solidjs/router'
import { arr_rnd, rnd_sign } from '../../game/random'
import { opposite, parseSquare } from 'chessops'
import { AuroraText, MarqueeText, SlicedText } from '../../components/TextEffects'
import { find_score_entry_index, type Score } from '../../state/create_leaderboard'
import { Leaderboard } from '../../components/Leaderboard'

export const PERSIST_NAME_PLAY_SHOW_STATE = '.banditchess.vs-stockfish-save.v0'

export default function() {

    return (<>
    <StockfishProvider>
        <WithStockfish/>
    </StockfishProvider>
    </>)
}

type GameResultType = 'game-ended' | '40-reached'
type GameResult = [GameResultType, Color | undefined]

type StockfishVSSave = {
    nth: number
    sans: SAN[]
    cursor_path: Path
    game_result: GameResult | undefined
    color: Color
    fen_pvs: Record<FEN, MultiPV>
    show_vote: boolean
}


function WithStockfish() {

    let [stockfish, { request_multipv }] = useStockfish()


    const downloaded_nb = () => stockfish.downloaded_nb
    const engine_failed = () => stockfish.engine_failed

    const stockfish_download_percent = createMemo(() => {
        let res = downloaded_nb()
        if (res) {
            let i =  Math.round(res.bytes / res.total * 100)

            if (i === 100) {
                return undefined
            }
            return i
        }
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
        cursor_path: '',
        game_result: undefined,
        fen_pvs: {},
        show_vote: true
    }), {
        name: PERSIST_NAME_PLAY_SHOW_STATE 
    })

    const nth = () => persist_state.nth

    function add_persist_step(step: Step) {
        set_persist_state("sans", persist_state.sans.length, step.san)
        set_persist_state("cursor_path", step.path)
    }


    const color = () => persist_state.color
    const engine_color = () => opposite(color())


    const steps = createMemo(() => state.replay.list)

    const fen = createMemo(() => state.replay.fen)
    const last_move = createMemo(() => state.replay.last_move)

    const eval_scored = createMemo(() => persist_state.fen_pvs[fen()] !== undefined)
    const movable = () => persist_state.game_result === undefined && eval_scored()

    initialize_replay(persist_state.sans, persist_state.cursor_path)

    const score_deltas = createMemo(() =>
        state.replay.list.map(_ => {
            let pvs = persist_state.fen_pvs[_.before_fen]

            if (!pvs) {
                return undefined
            }

            return score_pv(pvs, _.uci)
        })
    )


    const score_add_skip_opening = createMemo(() => state.replay.list.length < 10)

    const scores_for_color = (color: Color) => {

        let scores = createMemo(() => {

            let res = []
            let dd = score_deltas()
            for (let i = color === 'white' ? 10: 11; i< dd.length; i+=2) {
                res.push(dd[i])
            }
            return res
        })

        let classic = createMemo(() => scores().reduce<number>((a, b) => a + (b ?? 0), 0))
        let all_streak = createMemo(() => {

            let res: number[] = []
            let dd = scores()

            let s = 1
            for (let i = 0; i < dd.length; i++) {

                let d = dd[i]
                if (d === undefined) {
                    res.push(res[res.length-1] ?? 2)
                    continue
                }


                if (d > 0) {
                    res.push(s)
                    s++
                } else {
                    s = 1
                    res.push(s)
                }


            }

            return res
        })

        let streak = createMemo(() => all_streak()[all_streak().length - 1] ?? 0)

        let m_combo = createMemo(() => {

            let dd = scores()
            let ss = all_streak()

            let res = []
            for (let i = 0; i < dd.length; i++) {

                let d = dd[i]
                if (d) {
                    res.push(d * combo(ss[i]))
                }
            }
            return res.reduce((a, b) => a + b, 0)
        })

        let streak_delta = createMemo(on(streak, (a, b) => b === undefined ? 0 : a - b))

        let classic_delta = () => 0
        let combo_delta = () => 0

        return {
            get classic() { return classic() },
            get streak() { return streak() },
            get combo() { return m_combo() },
            get streak_delta() { return streak_delta() },
            get classic_delta() { return classic_delta() },
            get combo_delta() { return combo_delta() }
        }
    }

    const on_fen_eval_request_resolved = (fpvs: [FEN, MultiPV] | undefined) => {

        if (!fpvs) {
            return
        }

        let [f, pvs] = fpvs

        if (persist_state.fen_pvs[f]) {
            return
        }

        set_persist_state("fen_pvs", f, pvs)

        if (f === fen() && fen_turn(f) === engine_color()) {
            let pv = select_engine_pv(pvs)

            add_persist_step(add_uci_and_goto_it(pv.uci))
            request_next_fen_or_end_the_game()
        }
    }

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

        add_persist_step(add_uci_and_goto_it(uci))
        request_next_fen_or_end_the_game()
    }

    const request_next_fen_or_end_the_game = () => {
        if (fen_is_end(fen())) {
            let result: GameResult = ['game-ended', fen_winner(fen())]
            set_persist_state('game_result', result)
            set_open_new_high_score_modal(personal_best_achieved() !== undefined)
        } else if (fen_is_over_40(fen())) {
            let result: GameResult = ['40-reached', undefined]
            set_persist_state('game_result', result)
            set_open_new_high_score_modal(personal_best_achieved() !== undefined)
        } else {
            request_multipv(fen())
        }
    }

    const reset_persistence = () => {
        batch(() => {
            set_persist_state('color', opposite(persist_state.color))
            set_persist_state('game_result', undefined)
            set_persist_state("nth", _ => _ + 1)
            set_persist_state("sans", reconcile([]))
            set_persist_state("cursor_path", '')
            set_persist_state("fen_pvs", reconcile({}))

            initialize_replay([], '')
            request_next_fen_or_end_the_game()
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

    const on_go_highscores = () => {
        reset_persistence()
        navigate('/top')
    }

    const set_on_wheel = (i: number) => {
        if (i > 0) {
            goto_next_path_if_can()
        } else {
            goto_prev_path_if_can()
        }
    }

    createComputed(on(() => {
        let pvs = stockfish.pvs[fen()]

        if (pvs) {
            let res: [FEN, MultiPV] = [fen(), pvs]
            return res
        }
    }, on_fen_eval_request_resolved))


    let white_scores = createMemo(() => scores_for_color('white'))
    let black_scores = createMemo(() => scores_for_color('black'))
    let player_scores = createMemo(() => color() === 'white' ? white_scores() : black_scores())

    let [{ leaderboard }, { add_top_score, add_top_combo }] = useStore()


    const [top_score_entry_handle, set_top_score_entry_handle] = createSignal<string>('')
    const [top_score_entry_submitted, set_top_score_entry_submitted] = createSignal(false)

    const top_score_entry = createMemo<Score>(() => [top_score_entry_handle()!, player_scores().classic])
    const top_combo_entry = createMemo<Score>(() => [top_score_entry_handle()!, player_scores().combo])

    const top_scores_highlight = createMemo(() => {
        if (!persist_state.game_result) {
            return undefined
        }

        if (persist_state.game_result[1] !== color()) {
            return undefined
        }

        let i = find_score_entry_index(leaderboard.top_scores, top_score_entry())
        if (i === -1) {
            return undefined
        }
        return i
    })

    const top_combos_highlight = createMemo(() => {
        if (!persist_state.game_result) {
            return undefined
        }

        if (persist_state.game_result[1] !== color()) {
            return undefined
        }

        let i = find_score_entry_index(leaderboard.top_combos, top_combo_entry())
        if (i === -1) {
            return undefined
        }
        return i
    })

    function replace_highlight_entry(scores: (Score | undefined)[], i: number, entry: Score) {
        scores = scores.slice(0)
        scores.splice(i, 0, entry)
        scores.pop()
        return scores
    }


    const top_scores = createMemo(() => {
        let i_scores = top_scores_highlight()
        if (i_scores === undefined) {
            return undefined
        }
        if (top_score_entry_submitted()) {
            return leaderboard.top_scores
        }
        return replace_highlight_entry(leaderboard.top_scores, i_scores, top_score_entry()!)
    })

    const top_combos = createMemo(() => {
        let i_scores = top_combos_highlight()
        if (i_scores === undefined) {
            return undefined
        }
        if (top_score_entry_submitted()) {
            return leaderboard.top_combos
        }
        return replace_highlight_entry(leaderboard.top_combos, i_scores, top_combo_entry()!)
    })

    const personal_best_achieved = createMemo(() => top_scores() || top_combos())

    const [open_new_high_score_modal, set_open_new_high_score_modal] = createSignal(false)


    /*
    set_persist_state('game_result', ['game-ended', 'black'])
    set_open_new_high_score_modal(true)
    */

    const on_handle_changed = (handle: string) => {
        set_top_score_entry_handle(handle)
    }

    const on_submit_handle_entry = () => {
        add_top_score(top_score_entry())
        add_top_combo(top_combo_entry())
        set_top_score_entry_submitted(true)
    }

    const [show_vote_feedback, set_show_vote_feedback] = createSignal(persist_state.show_vote)


    const on_back_to_game = () => {
        set_open_new_high_score_modal(false)
        set_top_score_entry_submitted(false)
    }

    const on_skip_feedback = () => {
        set_persist_state('show_vote', false)
    }


    request_next_fen_or_end_the_game()

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
                    <Show when={stockfish_download_percent()}>{percent => 
                      <div class='downloading'>
                        <span>Downloading Stockfish..</span>
                        <div class='bar' style={{width: `${percent()}%`}}></div>
                      </div>
                    }</Show>
                </div>
                <div class='replay'>
                    <ReplaySingle onSetCursorPath={set_cursor_path} cursor_path={state.replay.cursor_path} steps={steps()} deltas={score_deltas()}>
                        <Show when={persist_state.game_result}>{ result => 
                            <GameResultOnReplay result={result()[0]} top={personal_best_achieved()!== undefined} win={result()[1] === color()} score={player_scores().classic} combo={player_scores().combo} />
                        }</Show>
                    </ReplaySingle>
                    <div class='scores'>
                        <ScoreDelta small={color()==="black"} flip={true} skip={score_add_skip_opening()} scores={white_scores()} />
                        <ScoreDelta small={color()==="white"} flip={false} skip={score_add_skip_opening()} scores={black_scores()} />
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

        <Show when={open_new_high_score_modal()}>
        <div class='modal-overlay'>
            <div class='modal'>
                    <div class='game-over-popup'>
                        <h2>New High Score</h2>
                        <MarqueeText text="Personal Best Achieved" />
                        <Show when={top_score_entry_submitted()} fallback={
                        <input type='text' placeholder="Enter Your Handle" maxLength="8" minLength="3" onInput={e => on_handle_changed((e.target as HTMLInputElement).value)} onChange={on_submit_handle_entry}></input>
                        }>
                            
                            <Show when={show_vote_feedback()} fallback={
                                <HighScoreReview onBackToGame={on_back_to_game} onGoHighscores={on_go_highscores} />
                            }>
                                    <VoteFeedback onSkip={on_skip_feedback} onClose={() => set_show_vote_feedback(false)}/>
                            </Show>
                         </Show>

                        <div class='leaderboards'>
                            <Show when={top_scores()}>{top_scores =>
                                <Leaderboard title="Top Scores" scores={top_scores()} highlight={top_score_entry_submitted() ? undefined : top_scores_highlight()} />
                            }</Show>
                            <Show when={top_combos()}>{top_combos =>
                                <Leaderboard title="Top Combo" scores={top_combos()} highlight={top_score_entry_submitted() ? undefined : top_combos_highlight()} />
                            }</Show>
                        </div>
                    </div>
            </div>
        </div>
        </Show>
    </main>
    </>)
}

function HighScoreReview(props: { onBackToGame: () => void, onGoHighscores: () => void }) {

    return (<>
        <div class='high-score-review'>
            <div class='buttons'>
                <MeetButton onClick={props.onGoHighscores} meet={true}>See High Scores</MeetButton>
                <MeetButton onClick={props.onBackToGame} draw={true}>Back to Game</MeetButton>
            </div>
        </div>
    </>)
}

type Vote = 'yes' | 'no' | 'skip'

function VoteFeedback(props: { onSkip: () => void, onClose: () => void }) {

    const submit = (vote: Vote) => {
        if (vote === 'skip') {
            props.onSkip()
        }
        props.onClose()
    }

    return (<>
    <div class='feedback'>
        <p>Did you like Bandit Chess?</p>
        <div class='buttons'>
        <MeetButton onClick={() => submit('yes')} draw={true}>Yes</MeetButton>
        <MeetButton onClick={() => submit('no') } draw={true} meet={true}>No</MeetButton>
        <MeetButton onClick={() => submit('skip') } gray={true}><small>Don't Show Again</small></MeetButton>
        </div>
    </div>
    </>)
}



function GameResultOnReplay(props: { result: GameResultType, score: number, combo: number, win: boolean, top: boolean }) {

    return (<>
    <div class='result'>
        <span class='over'>Game Over</span>
        <small>
            <Show when={props.result ==='40-reached'}>
                Move 40 reached.
            </Show>

            <Show when={props.result ==='game-ended'}>
                There has been a checkmate.
            </Show>
        </small>
        <Show when={props.win} fallback={
            <div class='lose'>
                <span class='header'><SlicedText text='You lost'></SlicedText></span>
            </div>
        }>
        <div class='win'>
           <span class='header'><AuroraText text="You Win!"></AuroraText></span>
           <div class='scores'>
           <span class='score'>Score: {props.score}</span>
           <span class='combo'>Combo: {props.combo}</span>
           </div>

                    <Show when={props.top}>
                        <div class='note'>
                            <div class='marquee'> <span>Personal Best Achieved.</span> </div>
                            <MarqueeText text="Personal Best Achieved." />
                        </div>
                    </Show>
            <Show when={false}>
            <div class='note2'>
                <MarqueeText text="Top Leaderboard Achieved."/>
            </div>
                    </Show>
        </div>
        </Show>
    </div>
    </>)
}

type StockfishScores = {
    classic: number, 
    streak: number, 
    combo: number, 
    streak_delta: number, 
    classic_delta: number, 
    combo_delta?: number
}

const combo = (streak: number) => streak > 2 ? 4 : streak > 1 ? 3 : 2
function ScoreDelta(props: { small: boolean, flip: boolean, skip: boolean, scores: StockfishScores }) {

    const scores = props.scores

    const should_bump_score_for_a_little_bit =
     createMemo(on(() => props.scores.classic, (a) => {
        setTimeout(() => set_bump_score(false), 200)
        return a
    }))



    const should_bump_streak_for_a_little_bit =
     createMemo(on(() => props.scores.streak, (a, b) => {
        setTimeout(() => set_bump_streak(false), 200)
        return [a, b ?? 2]
    }))

    const should_bump_combo_for_a_little_bit = createMemo(on(() => props.scores.combo, (a) => {
        setTimeout(() => set_bump_combo(false), 200)
        return a
    }))

    const should_shoot_streak_for_a_little_bit = createMemo(on(() => props.scores.streak, (a, b) => {
        setTimeout(() => set_shoot_streak(false), 200)
        return [a, b ?? 2]
    }))

    const [bump_score, set_bump_score] = createSignal(false)
    const [bump_streak, set_bump_streak] = createSignal(false)
    const [bump_combo, set_bump_combo] = createSignal(false)
    const [shoot_streak, set_shoot_streak] = createSignal(false)

    createEffect(() => set_bump_score(should_bump_score_for_a_little_bit() !== undefined))
    createEffect(() => set_bump_streak(arr_bump(should_bump_streak_for_a_little_bit())))
    createEffect(() => set_bump_combo(should_bump_combo_for_a_little_bit() !== undefined))
    createEffect(() => set_shoot_streak(arr_shoot(should_shoot_streak_for_a_little_bit())))

    const arr_bump = (a: number[]) => a[0] > a[1]
    const arr_shoot = (a: number[]) => a[0] < a[1]

    return (<>
        <div classList={{flip: props.flip, small: props.small }} class='score-delta'>
            <span classList={{ skip: props.skip, bump: bump_score() }} class='score'>{scores.classic}</span>
            <div classList={{ skip: props.skip }} class='combo-streak'>
                <span classList={{ bump: bump_streak() , shoot: shoot_streak() }} class='streak'>x{combo(scores.streak)}</span>
                <span classList={{ bump: bump_combo() }} class='combo'>{scores.combo}</span>
            </div>
        </div>
    </>)
}

function select_engine_pv(pv: MultiPV) {

    //return pv[pv.length - 1]
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
    //return 0
    let i = pvs.findIndex(_ => _.uci === uci)
    if (i === -1) {
        return 0
    }
    return pvs.length - i - 1
}

function ReplaySingle(props: { onSetCursorPath: (path: Path) => void, cursor_path: Path, steps: Step[], deltas: (number | undefined)[], children: JSX.Element }) {


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

        if (c() !== undefined) {
            cont.scrollTop = 99999
            return
        }

        let top = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight
        cont.scrollTo({ behavior: 'smooth', top })
    })

    let c = children(() => props.children)
    return (<>
        <div class='list-wrap'>
            <div ref={el => { $moves_el = el }} class='list'>
                <For each={props.steps}>{(step, i) =>
                <Step {...props} is_opening={i() < 10} delta={props.deltas[i()]} step={step} />
                }</For>
                <div class='padding'></div>
                {c()}
            </div>
        </div>
        <div class='padding'></div>
    </>)
}

function Step(props: { is_opening: boolean, delta: number | undefined, onSetCursorPath: (path: Path) => void, step: Step, cursor_path: Path }) {

    const step = props.step
    const plus_if_positive = (is_opening: boolean, delta?: number) => delta === undefined ? '...' : is_opening ? delta : delta === 0 ? '0': `+${delta}`

    const delta_klass = (is_opening: boolean, delta?: number) => delta === undefined ? '' : !show_klass() ? '' : is_opening ? 'opening' : delta >= 5 ? 'five' : delta > 2 ? 'four' : delta > 0 ? 'one' : 'zero'

    const [show_klass, set_show_klass] = createSignal(false)

    setTimeout(() => set_show_klass(true), 100)

    return (<>
        <span onClick={() => props.onSetCursorPath(step.path)} classList={{ 'on-path-end': step.path === props.cursor_path }} class='step'>{step.ply % 2 === 1 ? ply_to_index(step.ply) : ''} {step.san} <span classList={{ opening: props.is_opening, [delta_klass(props.is_opening, props.delta)]: true }} class='delta'>{plus_if_positive(props.is_opening, props.delta)} </span> </span>
    </>)
}

export const ply_to_index = (ply: number) => {
    let res = Math.ceil(ply / 2)
    return `${res}.` + (ply % 2 === 0 ? '..' : '')
}