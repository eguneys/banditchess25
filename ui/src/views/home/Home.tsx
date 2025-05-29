import { A, useNavigate } from "@solidjs/router"
import { For, Show } from "solid-js"
import './Home.scss'
import { MeetButton } from "../../components/MeetButton"
import { pad_7 } from "../../game/util"

export default function Home() {
  
  let navigate = useNavigate()

  function on_play_vs_stockfish() {

    navigate('vs')
  }

  const top_combo_scores = () => pad_7([])
  const top_scores = () => pad_7([])
  const top_rating = () => pad_7([])

  return (<>
  <main class='bandit'>
    <div class='fixed'>
        <span>z</span>
    </div>
    <div class='content'>
    <h2>Bandit Chess</h2>
    <p>
      Classic Chess, but every move scores up to 6 points if it's in the engine's top 6 — otherwise, nothing.
    </p>

    <div class='play-vs-buttons'>
      <MeetButton draw={true} onClick={on_play_vs_stockfish}>Play vs Stockfish</MeetButton>
      <MeetButton draw={true} disabled={true}>Play vs People</MeetButton>
    </div>

    <div class='leaderboard'>
      <div class='category'>
        <h4>Top Combo Scores</h4>
          <ul>
            <For each={top_combo_scores()}>{top =>
              <li class='top'>
                <Show when={top} fallback={<span>--</span>}>{top =>
                  <div class='user'>Top user {top()} </div>
                }</Show>
              </li>
            }</For>
        </ul>
      </div>
      <div class='category'>
        <h4>Top Scores</h4>
          <ul>
            <For each={top_scores()}>{top =>
              <li class='top'>
                <Show when={top} fallback={<span>--</span>}>{top =>
                  <div class='user'>Top user {top()} </div>
                }</Show>
              </li>
            }</For>
        </ul>
      </div>
      <div classList={{disabled: true}} class='category'>
        <h4>Top Rating</h4>
          <ul>
            <For each={top_rating()}>{top =>
              <li class='top'>
                <Show when={top} fallback={<span>--</span>}>{top =>
                  <div class='user'>Top user {top()} </div>
                }</Show>
              </li>
            }</For>
        </ul>
      </div>
    </div>
    <small>
      Combo Scores is a separate score category where streaks earn extra points.
      <br/>
      The first 6 moves are not scored to skip opening theory.
      <br/>
      You have to win the game to be eligible for leaderboards.
    </small>
    <footer>
      <A href="/about">About</A>
    </footer>
    </div>
    </main>
  </>)
}
