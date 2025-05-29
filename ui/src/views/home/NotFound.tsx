import { A } from "@solidjs/router";
import './NotFound.scss'

export default function() {
  return (<>
  <main class='not-found'>

  <p>
    404 Not Found
  </p>
  <A href='/'>Back to Home</A>
  </main>
  </>)
}