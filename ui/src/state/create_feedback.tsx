import { createStore } from "solid-js/store"
import { $ } from "./create_leaderboard"

export type FeedbackState = {
    thankyou: 0
}

export type FeedbackActions = {
    submit_vote(handle: string, vote: Vote): Promise<void>
}

export type Vote = 'yes' | 'no' | 'skip'

export function create_feedback(): [FeedbackState, FeedbackActions] {

    let agent = create_agent()

    let [state, _set_state] = createStore<FeedbackState>({
        thankyou: 0
    })

    let actions = {
        async submit_vote(handle: string, vote: Vote) {
            await agent.submit_vote(handle, vote)
        }
    }

    return [state, actions]
}


function create_agent() {


    async function submitVote(handle: string, vote: Vote) {
        const res = await $('/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle, vote })
        }).catch(err => console.error(err));
        return res
    }

    return {
        async submit_vote(handle: string, vote: Vote) {
            return await submitVote(handle, vote)
        }
    }
}