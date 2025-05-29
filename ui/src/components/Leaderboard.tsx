import { For, Show } from 'solid-js'
import type { Score } from '../state/create_leaderboard'
import './Leaderboard.scss'
import { pad_7 } from '../game/util'

export function Leaderboard(props: { title: string, scores?: (Score | undefined)[], highlight?: number }) {

    const scores = () => props.scores ?? pad_7([])
    const skip = () => props.scores === undefined

    const is_new = (created_at: number) => Date.now() - created_at < 10 * 60 * 1000

    return (<>
        <div class='leaderboard' classList={{skip: skip()}}>
            <h4>{props.title}</h4>
            <div class='list'>
                <For each={pad_7(scores())}>{ (score, i) => 
                <Show when={score} fallback={
                    <div class='item'>
                        <div class='nb'>{i()+1}.</div>
                        <div class='entry'>--</div>
                    </div>
                }>{score => 
                        <div class='item' classList={{highlight: i() === props.highlight, new: is_new(score()[2])}}>
                            <div class='nb'>{i()+1}.</div>
                            <div class='entry'><span>{score()[0] === '' ? '...': score()[0]}</span><span>{score()[1]}</span></div>
                        </div>
                    }</Show>
                }</For>
            </div>
        </div>
    </>)
}