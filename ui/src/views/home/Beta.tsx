import { A } from "@solidjs/router";
import './Beta.scss'
import { Show } from "solid-js";

export default function(props: { message?: string }) {


    const on_clear_local_storage = () => {
        window.localStorage.clear()
        window.alert('Done.')
        window.location.href = '/'
    }

  return (<>
  <main class='beta'>
  <p>
    Beta Mode
  </p>
  <p>
    An likely unexpected error occurred.
    </p>
    <Show when={props.message}>
      <p>
        {props.message}
      </p>
    </Show>
    <small></small>
    <p>
    If the issue persists, clear your local storage by clicking <span class='clear' onClick={on_clear_local_storage}>here</span>, or do it manually.
    &nbsp;<small>This will erase all your personal best scores and settings.</small>
  </p>
  <A href='/'>Back to Home</A>
  </main>
  </>)
}