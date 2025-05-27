import { makePersisted } from "@solid-primitives/storage";
import { createContext, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";

type Page = 'home' | 'stockfish' | 'player'

type Actions = {
    set_page(page: Page): void
    inc_nth_vs_stockfish(): void
}

type State = {
    page: Page
    nth_vs_stockfish: number
}

let p_version = 1

type Store = [State, Actions]

export function StoreProvider(props: { children: JSX.Element}) {

    let [state, set_state] = makePersisted(createStore<State>({
        page: 'home',
        nth_vs_stockfish: 1
    }), { name: '.banditchess.v' + p_version})

    let actions = {
        set_page(page: Page) {
            set_state("page", page)
        },
        inc_nth_vs_stockfish() {
            set_state("nth_vs_stockfish", _ => _ + 1)
        }
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