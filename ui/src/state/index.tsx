import { createContext, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { create_replay, type ReplayActions, type ReplayState } from "./create_replay";
import { create_leaderboard, type LeaderboardActions, type LeaderboardState, type WorldLeaderboardState } from "./create_leaderboard";
import { create_feedback, type FeedbackActions, type FeedbackState } from "./create_feedback";

type Actions = ReplayActions & LeaderboardActions & FeedbackActions

type State = {
    replay: ReplayState
    leaderboard: LeaderboardState
    world_leaderboard: WorldLeaderboardState
    feedback: FeedbackState
}

type Store = [State, Actions]

export function StoreProvider(props: { children: JSX.Element}) {

    let [replay_state, replay_actions] = create_replay()
    let [feedback_state, feedback_actions] = create_feedback()
    let [world_leaderboard, leaderboard_state, leaderboard_actions] = create_leaderboard()

    let [state, _set_state] = createStore<State>({
        replay: replay_state,
        leaderboard: leaderboard_state,
        world_leaderboard,
        feedback: feedback_state
    })

    let actions = {
        ...replay_actions,
        ...leaderboard_actions,
        ...feedback_actions
    }

    let store: Store = [state, actions]


    return (<StoreContext.Provider value={store}>
        {props.children}
    </StoreContext.Provider>)

}

const StoreContext = createContext<Store>()

export function useStore() {
    return useContext(StoreContext)!
}