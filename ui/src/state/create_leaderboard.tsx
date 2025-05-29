import { createStore } from "solid-js/store"
import { pad_7 } from "../game/util"
import { makePersisted } from "@solid-primitives/storage"


export type Score = [string, number]

export function find_score_entry_index(scores: (Score | undefined)[], score: Score) {
    return scores.findIndex(_ => !_ || _[1] <= score[1])
}

export type LeaderboardState = {
    top_scores: (Score | undefined)[],
    top_combos: (Score | undefined)[]
    world_top_scores: (Score | undefined)[],
    world_top_combos: (Score | undefined)[]
    world_top_rating: (Score | undefined)[]
}

export type LeaderboardActions = {
    add_top_score(score: Score): void
    add_top_combo(combo: Score): void
}

export function create_leaderboard(): [LeaderboardState, LeaderboardActions] {

    let [state, set_state] = makePersisted(createStore<LeaderboardState>({
        top_scores: pad_7([]),
        top_combos: pad_7([]),
        world_top_scores: pad_7([]),
        world_top_combos: pad_7([]),
        world_top_rating: pad_7([]),
    }), {
        name: '.banditchess.top_scores.v2'
    })

    let actions = {
        add_top_score(score: Score) {

            let i = find_score_entry_index(state.top_scores, score)

            let scores = state.top_scores.slice(0)
            scores.splice(i, 0, score)
            scores.pop()
            console.log(scores)

            set_state('top_scores', scores)

        },
        add_top_combo(score: Score) {

            let i = find_score_entry_index(state.top_combos, score)

            let scores = state.top_combos.slice(0)
            scores.splice(i, 0, score)
            scores.pop()

            set_state('top_combos', scores)
        },
    }

    return [state, actions]
}