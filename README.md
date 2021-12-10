# esbuild-plugin-postcss3

This plugin is forked from [esbuild-plugin-postcss2](https://github.com/martonlederer/esbuild-plugin-postcss2).

It fix some bugs of upstream likes can't compile with bluma-css, fluent-ui.

It also support cache, it can reduce the incremental rebuild time in dev mode from several seconds to less than one second.

## Install

```sh
yarn add -D @baurine/esbuild-plugin-postcss3
```

or

```sh
npm i -D @baurine/esbuild-plugin-postcss3
```

## Usage

Add the plugin to your esbuild plugins:

```js
const esbuild = require("esbuild");
const postCssPlugin = require("@baurine/esbuild-plugin-postcss3");

esbuild.build({
  ...
  plugins: [
    postCssPlugin.default()
  ]
  ...
});
```

### PostCSS plugins

Add your desired PostCSS plugin to the plugins array:

```js
const autoprefixer = require("autoprefixer");

esbuild.build({
  ...
  plugins: [
    postCssPlugin.default({
      plugins: [autoprefixer]
    })
  ]
  ...
});
```

### CSS modules

PostCSS modules are enabled by default. You can pass in a config or disable it with the `modules` field:

```js
postCssPlugin.default({
  // pass in `postcss-modules` custom options
  // set to false to disable
  modules: {
    getJSON(cssFileName, json, outputFileName) {
      const path = require("path");
      const cssName = path.basename(cssFileName, ".css");
      const jsonFileName = path.resolve("./build/" + cssName + ".json");

      fs.writeFileSync(jsonFileName, JSON.stringify(json));
    }
  }
});
```

### Preprocessors

To use preprocessors (`sass`, `scss`, `stylus`, `less`), just add the desired preprocessor as a `devDependency`:

```sh
yarn add -D sass
```

### Enable cache

To reduce the rebuild time in dev mode, you can try to cache the CSS compilation result.

> Note: currently it only supports `.css/.less/.scss`, doesn't support `.styl` yet.

```js
const esbuild = require("esbuild");
const postCssPlugin = require("@baurine/esbuild-plugin-postcss3");

esbuild.build({
  ...
  plugins: [
    postCssPlugin.default({
      enableCache: true
    })
  ]
  ...
});
```
