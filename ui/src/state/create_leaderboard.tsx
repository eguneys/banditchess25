import { createStore } from "solid-js/store"
import { pad_7 } from "../game/util"
import { makePersisted } from "@solid-primitives/storage"
import { createAsync } from "@solidjs/router"
import { createSignal } from "solid-js"


export type Score = [string, number, number]

export function find_score_entry_index(scores: (Score | undefined)[], score: Score) {
    return scores.findIndex(_ => !_ || _[1] <= score[1])
}

export type LeaderboardState = {
    top_scores: (Score | undefined)[],
    top_combos: (Score | undefined)[]
}

export type WorldLeaderboardState = {
    world_top_scores?: (Score | undefined)[],
    world_top_combos?: (Score | undefined)[]
    world_top_rating?: (Score | undefined)[]
}

export type LeaderboardActions = {
    add_top_score(score: Score): void
    add_top_combo(combo: Score): void
}

export function create_leaderboard(): [WorldLeaderboardState, LeaderboardState, LeaderboardActions] {

    let agent = create_agent()

    const [fetch_scores, set_fetch_scores] = createSignal(true, { equals: false })
    const [fetch_combos, set_fetch_combos] = createSignal(true, { equals: false })

    const world_top_scores = createAsync(async () => {
        if (!fetch_scores()) {
            return undefined
        }
        return agent.get_scores()
    })
    const world_top_combos = createAsync(async () => {
        if (!fetch_combos()) {
            return undefined
        }
        return agent.get_combos()
    })

    let [state, set_state] = makePersisted(createStore<LeaderboardState>({
        top_scores: pad_7([]),
        top_combos: pad_7([]),

    }), {
        name: '.banditchess.top_scores.v2'
    })


    let world_state: WorldLeaderboardState = {
        get world_top_scores() {
            let res = world_top_scores()
            if (!res) {
                return undefined
            }
            return pad_7(res)
        },
        get world_top_combos() {
            let res = world_top_combos()
            if (!res) {
                return undefined
            }
            return pad_7(res)
        },
        world_top_rating: pad_7([]),
    }


    let actions = {
        add_top_score(score: Score) {

            let i = find_score_entry_index(state.top_scores, score)

            let scores = state.top_scores.slice(0)
            scores.splice(i, 0, score)
            scores.pop()

            set_state('top_scores', scores)

            if (world_state.world_top_scores && find_score_entry_index(world_state.world_top_scores, score) !== -1) {
                agent.submit_score(score).then(() => set_fetch_scores(true))
            }
        },
        add_top_combo(score: Score) {

            let i = find_score_entry_index(state.top_combos, score)

            let scores = state.top_combos.slice(0)
            scores.splice(i, 0, score)
            scores.pop()

            set_state('top_combos', scores)


            if (world_state.world_top_combos && find_score_entry_index(world_state.world_top_combos, score) !== -1) {
                agent.submit_combo(score).then(() => set_fetch_combos(true))
            }
        },
    }

    return [world_state, state, actions]
}


type LeaderboardAgent = {
    get_scores(): Promise<Score[]>
    get_combos(): Promise<Score[]>
    submit_score(score: Score): Promise<void>
    submit_combo(score: Score): Promise<void>
}

function create_agent(): LeaderboardAgent {

    const API_ENDPOINT = import.meta.env.DEV ? `http://localhost:3300` : ``
    const $ = (path: string, opts?: RequestInit) => fetch(API_ENDPOINT + path, opts).then(_ => _.json())


    // Obfuscated-ish hash generator using a simplified SHA-256 via SubtleCrypto
    async function generateHash(handle: string, score: number) {
        const encoder = new TextEncoder();
        const secret = 's3cr3t-s@lt';
        const data = `${secret}:${handle}:${score}`;
        const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function submitScore(handle: string, score: number, combo: string) {
        const hash = await generateHash(handle, score);
        const res = await $('/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle, score, hash, combo })
        }).catch(err => console.error(err));
        return res
    }

    const leaderboard_score_convert = (api: { handle: string, score: number, created_at: number }) => [api.handle, api.score, api.created_at]

    return {
        get_scores() {
            return $('/leaderboard/score').then(_ => _.map(leaderboard_score_convert)).catch(err => console.error(err))
        },
        get_combos() {
            return $('/leaderboard/combo').then(_ => _.map(leaderboard_score_convert)).catch(err => console.error(err))
        },
        async submit_score(score: Score) {
            await submitScore(score[0], score[1], 'score')
        },
        async submit_combo(score: Score) {
            await submitScore(score[0], score[1], 'combo')
        }
    }
}