import { createContext, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { create_replay, type ReplayActions, type ReplayState } from "./create_replay";
import { create_leaderboard, type LeaderboardActions, type LeaderboardState } from "./create_leaderboard";

type Actions = ReplayActions & LeaderboardActions

type State = {
    replay: ReplayState
    leaderboard: LeaderboardState
}

type Store = [State, Actions]

export function StoreProvider(props: { children: JSX.Element}) {

    let [replay_state, replay_actions] = create_replay()
    let [leaderboard_state, leaderboard_actions] = create_leaderboard()

    let [state, _set_state] = createStore<State>({
        replay: replay_state,
        leaderboard: leaderboard_state
    })

    let actions = {
        ...replay_actions,
        ...leaderboard_actions
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