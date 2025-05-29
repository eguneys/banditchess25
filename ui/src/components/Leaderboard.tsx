import { For, Show } from 'solid-js'
import type { Score } from '../state/create_leaderboard'
import './Leaderboard.scss'
import { pad_7 } from '../game/util'

export function Leaderboard(props: { title: string, scores: (Score | undefined)[], highlight?: number }) {

    return (<>
        <div class='leaderboard'>
            <h4>{props.title}</h4>
            <div class='list'>
                <For each={pad_7(props.scores)}>{ (score, i) => 
                <Show when={score} fallback={
                    <div class='item'>
                        <div class='nb'>{i()+1}.</div>
                        <div class='entry'>--</div>
                    </div>
                }>{score => 
                        <div class='item' classList={{highlight: i() === props.highlight}}>
                            <div class='nb'>{i()+1}.</div>
                            <div class='entry'><span>{score()[0] === '' ? '...': score()[0]}</span><span>{score()[1]}</span></div>
                        </div>
                    }</Show>
                }</For>
            </div>
        </div>
    </>)
}