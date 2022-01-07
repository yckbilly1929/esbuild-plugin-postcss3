// css module files
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.sass" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.less" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.styl" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// declaration
/// <reference types="less" />
import { Plugin } from "esbuild";
import { Plugin as PostCSSPlugin } from "postcss";
import { Options as SassOptions } from "sass";
import stylus from "stylus";
declare type StylusRenderOptions = Parameters<typeof stylus.render>[1];
interface PostCSSPluginOptions {
  plugins: PostCSSPlugin[];
  modules: boolean | any;
  rootDir?: string;
  sassOptions?: SassOptions;
  lessOptions?: Less.Options;
  stylusOptions?: StylusRenderOptions;
  writeToFile?: boolean;
  enableCache?: boolean;
}
export declare const defaultOptions: PostCSSPluginOptions;
declare const postCSSPlugin: ({
  plugins,
  modules,
  rootDir,
  sassOptions,
  lessOptions,
  stylusOptions,
  writeToFile,
  enableCache
}?: PostCSSPluginOptions) => Plugin;
export default postCSSPlugin;
