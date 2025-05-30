import { A } from '@solidjs/router'
import { Leaderboard } from '../../components/Leaderboard'
import './Show.scss'
import { useStore } from '../../state'


export default function() {

    let [{world_leaderboard, leaderboard}] = useStore()

    return (<>
        <main class='leaderboards'>
            <div class='background'>

            </div>
            <h1>Leaderboards</h1>
            <div class='content'>
            <section class='world'>
                <h3>World</h3>
                <div class='boards'>
                    <Leaderboard title="Top Scores" scores={world_leaderboard.world_top_scores} />
                    <Leaderboard title="Top Combos" scores={world_leaderboard.world_top_combos} />
                </div>
            </section>
            <section class='personal'>
                <h3>Personal Best</h3>
                <div class='boards'>
                    <Leaderboard title="Top Scores" scores={leaderboard.top_scores} />
                    <Leaderboard title="Top Combos" scores={leaderboard.top_combos} />
                </div>
            </section>
            </div>
            <A href='/'>Back to Home</A>
    </main>
    </>)
}