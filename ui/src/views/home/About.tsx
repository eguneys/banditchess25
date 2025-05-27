import { A } from "@solidjs/router"
import './About.scss'

export default () => {
    return (<>
    <main class='about'>
        <h2>About Bandit Chess</h2>
        <p>
            Hobby project developed by gsoutz.
            <br/>
            MIT License.
        </p>
        <p>
                <span class='donate'>Please consider donating at: </span>
        <A href="https://aidchess.com/donate" target="_blank">https://aidchess.com/donate</A>
        </p>
        <p>
        <small>
            Various settings and game history is stored locally on your local storage or IndexedDB.
            <br/>
            The Stockfish engine is locally run on your computer.
            <br/>
            Your top scores and handle for leaderboards, and your feedback, are stored on the server.
            <br/>
            No cookies, ads, trackers or premium services are used on this website.
            <br/>
        </small>
        </p>
        <p>
            <small>
            Many thanks to lichess.org and their developer community.
            </small>
        </p>
        <p>
          Share the ❤️ and <A href="/">Back to Home</A>
        </p>
    </main>
    </>)
}