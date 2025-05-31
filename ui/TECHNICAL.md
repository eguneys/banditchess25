I introduced Bandit Chess in my introductory [blog article on lichess](https://lichess.org/@/heroku). In this article I explain the technical aspects and my personal journey of developing Bandit Chess in just 3 days.

*Classic Chess, but every move scores up to 6 points if it's in the engine's top 6 — otherwise, nothing.*

This idea came to my mind in a bliss, after a long involvement of Chess, AI and Game Development. It immediately made sense to me, after joining 3 game jams under 2 months and making 3 mediocre games, I decided to make it.

I have invested a decent amount of time in Typescript, HTML, WebGL technologies, I've been submitting games to JS13K since 2019, only getting Top 100 and winnning a T-Shirt once. So I am only mediocre on game development.

It's demanding the mix of code, art and design in dramatic ways for the sole purpose of entertainment. Amateurly speaking, there is a line where, the quality of your content, is either professional, or poorly put. Most of the times it's the latter for me. I do keep trying to improve and at least make it to the home page of itch.io.

So I've also deeply studied since a long time ago lichess codebase. Scala, functional programming, Haskell, even Prolog all makes sense to me. I dig reactive programming through SolidJS.

In case you are wondering, the game that came 63 on JS13K is a 2D Platformer inspired by Celeste but that was a long time ago.

So WebGL aside, I also developed the website aidchess.com. It also uses chessground, the chess board used on lichess. And it features a move replay view, that shows the chess moves and variations in a tree structure.

Aidchess.com has no backend, and it is feature-wise lacks content, so basically non-advertisable. But it has hidden features, so feel free to play around with it.

For the past couple of years, I see a chess themed website, with a different feature set, pop up every once in a while. Usually it is either behind a paywall, requires sign-up or lacks actual content. I believe in free educational content easily accessible to everyone. I also value the effort and time invested in developing such content so that's where the community has to step in. I reached out to an open source community developing opening theory studies on lichess, but we couldn't cooperate. So maybe in the future.

Back to Bandit Chess, it works as a single page application that uses SolidJS. I use vite for the bundler it's a really smooth immediate feedback developer experience. SCSS shapes the overall visual design. 

I am semi-parted for not using just WebGL and building a visually impressive design, not that I am mostly capable, but it enables certain degree of visual possibilities. But the already established chess board code and the flexibility of HTML and CSS, greatly simplifies the amount of work to be done. 

I setup a goal to quickly finish a prototype, in a fail fast approach and introduce the game to the players in a blog post as soon as possible and gather feedback. That will decide whether I should move on to another project or not.

Also there is the leaderboards, this time some reason to involve a backend and possibly maintain it for the future. It's a simple NodeJS Express server I asked Chat GPT to write, which I further refined it to my needs better.

SolidJS-wise there's this tension between using `createEffect` to affect the control flow, or let it flow by itself. So it's not pretty sometimes, I stumbled upon a trouble, which I describe in this [SO post](https://stackoverflow.com/questions/79643762/createcomputed-with-2-dependencies-one-dependency-changes-quickly-the-first-dep).


For the amount of polish, it still doesn't pass the professional tests. Is this the best I can do? We will see how much time I have to do it better.

The MIT Licensed source code for Bandit Chess can be found [here](https://github.com/eguneys/banditchess25).