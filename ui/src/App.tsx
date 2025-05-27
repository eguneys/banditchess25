import { lazy } from 'solid-js'
import './App.scss'
import { StoreProvider} from './state'
import { MetaProvider } from '@solidjs/meta'
import { Route, Router } from '@solidjs/router'

const Home = lazy(() => import('./views/home/Home'))
const About = lazy(() => import('./views/home/About'))
const Stockfish = lazy(() => import('./views/play/Show'))

function MyApp() {

  return (<>
  <MetaProvider>
      <Router root={AppInRouterWithStore}>
        <Route path="/" component={Home}/>
        <Route path="/vs" component={Stockfish}/>
        <Route path="/about" component={About}/>
      </Router>
    </MetaProvider>
  </>)
}

import type { RouteSectionProps } from '@solidjs/router'

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
