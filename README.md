# Glue

Glue images together vertically by matching image contents.

## Background
Had a small conversation with [ChatGPT](https://chat.openai.com/). Wanted to screenshot the whole page (so one image for all scrolled content) but all browser plugins I tried didn't manage to do it correctly. I guess, because the scrolled element wasn't the pages `<body>` but some `<div>` maybe. So I scrolled took a [bunch of screenshots](example/) manually and, as probably a lot of programmers would do, decided not to spend 5 minutes in photoshop to glue them together, but rather a few hours to write a tool for that, playing around with some technologies I have wanted to try out for a while. 

## What I learned

### Vite
I wanted to use [Svelte](https://svelte.dev), for the first time doing more with it than following the [amazing tutorial](https://svelte.dev/tutorial/basics), and learned the best way to get started / for scaffolding is using `npm create vite` and following the prompt. It seems to combine tooling for development with bundling builds quite nicely. I guess it comes with some opinionated defaults, which were so far perfectly fine for me.

### Svelte
My opinion of Svelte as "the better react" still holds; the "reactivity" works out nicely; even in conjunction with "callback heavy" webworker communication. For inputs or forms, I like that binding values to inputs is possible without explictly writing callbacks all the time. 

I used a [svelte store](src/lib/imagesStore.ts) in a similar fashion as I would use a redux store: Components can subscribe to it and modify the state by strictly defined changes - here, it's function calls, whereas in the redux version, those would be emitted actions (strictly defined via typesscript Type Definitions). I like the function-call-version better since it feels less verbose than a bunch of action types. On the downside, I don't have amazing tools like Time Travel Debugging with [Redux DevTools](https://github.com/reduxjs/redux-devtools). However, for a small application, that's perfectly fine; I also feel like, when you're at the point in a larger application where you really *need* time travel debugging, something bigger might be wrong...

### Web Workers
Never used web workers before, this seemed like a good use case: The image matching is very brute force-y and thus computation heavy and I don't want to block the UI all the time. Spawning them and communication between workers and the main thread is [rather straight forward](src/lib/image-matching/Matcher.svelte). Interesting topics, also for further optimization, are probably [transferable](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) or [shared](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) data structures. For now, the main thread is sending rather large arrays to workers and there's probably better solutions for that.

### Canvas
Looks nice, what options frontend devs have with a canvas nowadays, even though I only use it to render some images and some rectangles.

I tried to push the (imperative) draw-to-canvase function in the [Matcher-Component](src/lib/image-matching/Matcher.svelte) "to the edge" and stay reactive as much as possible. It might be interesting to check out one of [these](https://github.com/dnass/svelte-canvas) [approaches](https://www.thisdot.co/blog/declarative-canvas-with-svelte) to make drawing to the canvas even more concise or cleaner in the Matcher-Component.

For interactable elements that are "on the canvas" (the [Accept-Buttons](src/lib/image-matching/AcceptButton.svelte); see their usage in [Matcher](src/lib/image-matching/Matcher.svelte) as well) I use elements that are not really on the canvas but are synchronized to its width/height. For now, that's okay, but there's probably better solutions for that, e.g. detecting mouse events on the canvas.

## Missing Features
For now, I'm fine with the application (glued my images together after all), but if I were to continue working on this, I'd probably tackle these topics:

* nicer layout - especially the configuration doesn't look great for now
* add "reject" button - for now, a user can only accept the best match to stop the worker from continuing. It would also be useful to reject a match and be offered the next-best one. Maybe even give a hint if the match is expected further up or down
* other image formats than PNG
* extend the config to be able to include or exclude image portions which contain "empty" areas, i.e. areas with only one color - when trying to match the example set with the default values, you can see why that might be desirable sometimes.
* optimizations of the image matching algorithm
* enable matching not from the very top of the bottom image - for now, the bottom image's top must be contained exactly in somewhere in the top image. If that's not the case (e.g. if there were some shadow on the top of images, like there is at the bottom in the case of the sample set), we couldn't match. However, just trying out multiple lines multiplies the steps when brute-forcing for a match, so be careful what you wish for...

Whoever reads this, feel free to clone, start with `npm run dev` and play around - and open a pull request with improvements :)

-------
Original README created by the vite project below:
-------

# Svelte + TS + Vite

This template should help get you started developing with Svelte and TypeScript in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Need an official Svelte framework?

Check out [SvelteKit](https://github.com/sveltejs/kit#readme), which is also powered by Vite. Deploy anywhere with its serverless-first approach and adapt to various platforms, with out of the box support for TypeScript, SCSS, and Less, and easily-added support for mdsvex, GraphQL, PostCSS, Tailwind CSS, and more.

## Technical considerations

**Why use this over SvelteKit?**

- It brings its own routing solution which might not be preferable for some users.
- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

This template contains as little as possible to get started with Vite + TypeScript + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

Should you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

**Why `global.d.ts` instead of `compilerOptions.types` inside `jsconfig.json` or `tsconfig.json`?**

Setting `compilerOptions.types` shuts out all other types not explicitly listed in the configuration. Using triple-slash references keeps the default TypeScript setting of accepting type information from the entire workspace, while also adding `svelte` and `vite/client` type information.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `allowJs` in the TS template?**

While `allowJs: false` would indeed prevent the use of `.js` files in the project, it does not prevent the use of JavaScript syntax in `.svelte` files. In addition, it would force `checkJs: false`, bringing the worst of both worlds: not being able to guarantee the entire codebase is TypeScript, and also having worse typechecking for the existing JavaScript. In addition, there are valid use cases in which a mixed codebase may be relevant.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/rixo/svelte-hmr#svelte-hmr).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

```ts
// store.ts
// An extremely simple external store
import { writable } from 'svelte/store'
export default writable(0)
```
