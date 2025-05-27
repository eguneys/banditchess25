import { PlayUciBoard } from '../../components/PlayUciBoard'
import { useStore } from '../../state'
import './Show.scss'

export default function() {

    const [state] = useStore()

    const nth = () => state.nth_vs_stockfish

    return (<>
    <main class='vs'>
        <div class='info'>
            <h3>Bandit vs Stockfish</h3>
            <span>Match #{nth()}</span>
        </div>
        <div class='board-wrap'>
            <div class='board'>
            <PlayUciBoard color="white" fen="" last_move={undefined}/>
            </div>
        </div>
        <div class='replay-wrap'>
            <div class='user-top'>
                <span class='user ai'>Stockfish</span>
                <span class='score'>0</span>
                <span class='score'>x2 0</span>
                <span class='time'>0:00</span>
            </div>
            <div class='replay'>
            </div>
            <div class='user-bottom'>
                <span class='user'>You</span>
                <span class='score'>0</span>
                <span class='score'>x2 0</span>
                <span class='time'>0:00</span>
            </div>
        </div>
        <div class='history'>
            History
        </div>
    </main>
    </>)
}