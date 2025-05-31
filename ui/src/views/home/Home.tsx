import { A, useNavigate } from "@solidjs/router"
import './Home.scss'
import { MeetButton } from "../../components/MeetButton"
import { Leaderboard } from "../../components/Leaderboard"
import { useStore } from "../../state"

export default function Home() {
  
  let navigate = useNavigate()

  function on_play_vs_stockfish() {

    navigate('vs')
  }

  const [{world_leaderboard}] = useStore()

  return (<>
  <main class='bandit'>
    <div class='background'>

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

    <div class='leaderboards'>
      <div class='categories'>
      <div class='category'>
        <Leaderboard title="Top Combo Scores" scores={world_leaderboard.world_top_combos}/>
      </div>
      <div class='category'>
        <Leaderboard title="Top Scores" scores={world_leaderboard.world_top_scores}/>
      </div>
      <div classList={{disabled: true}} class='category'>
        <Leaderboard title="Top Rating" scores={world_leaderboard.world_top_rating}/>
      </div>
</div>
          <p class='leader-link'>
            <A href='top'>More Leaderboards</A>
          </p>
        </div>

    <small>
      Combo Scores is a separate score category where streaks earn extra points.
      <br/>
      The first 6 moves are not scored to skip opening theory.
      <br/>
      You have to win* the game  to be eligible for leaderboards.
      <br/>
      Game ends when move 40 is reached, or a checkmate happens.
      <br/>
      <small>*Either by getting a checkmate or getting a higher score than Stockfish</small>
    </small>
    <footer>
      <A href="/about">About</A>
      <A href="/beta">Beta</A>
    </footer>
    </div>
    </main>
  </>)
}
