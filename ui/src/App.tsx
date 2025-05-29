import { lazy } from 'solid-js'
import './App.scss'
import { StoreProvider} from './state'
import { MetaProvider } from '@solidjs/meta'
import { A, Route, Router } from '@solidjs/router'

const Home = lazy(() => import('./views/home/Home'))
const About = lazy(() => import('./views/home/About'))
const Stockfish = lazy(() => import('./views/play/Show'))
const NotFound = lazy(() => import('./views/home/NotFound'))
const Leaderboard = lazy(() => import('./views/leaderboard/Show'))

function MyApp() {

  return (<>
  <MetaProvider>
      <Router root={AppInRouterWithStore}>
        <Route path="/" component={Home}/>
        <Route path="/vs" component={Stockfish}/>
        <Route path="/top" component={Leaderboard}/>
        <Route path="/about" component={About}/>
        <Route path="*" component={NotFound}/>
      </Router>
    </MetaProvider>
  </>)
}


const AppInRouterWithStore = (props: RouteSectionProps) => {
  return (
    <StoreProvider>
      <AppInRouter {...props} />
    </StoreProvider>
  )
}

const AppInRouter = (props: RouteSectionProps) => {
  return (
    <>
      <header>
      </header>
      <div class='main-wrap'>
        {props.children}
      </div>
    </>
  )
}


export default MyApp
