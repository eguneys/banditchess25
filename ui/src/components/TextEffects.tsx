import './TextEffects.scss'


export function SlicedText(props: { text: string }) {
    return (<>
        <section data-heading={props.text} class="sliced-text"> {props.text} </section>
    </>)
}


export function AuroraText(props: { text: string }) {

    return (<>
        <div class="aurora-text">
            <div class="title">{props.text}
                <div class="aurora">
                    <div class="aurora__item"></div>
                    <div class="aurora__item"></div>
                    <div class="aurora__item"></div>
                    <div class="aurora__item"></div>
                </div>
            </div>
        </div>
    </>)
}


export function MarqueeText(props: { text: string }) {
    return (<>
        <div class='marquee'> <span>{props.text}</span> </div>
    </>)
}