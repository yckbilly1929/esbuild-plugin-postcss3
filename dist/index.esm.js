import {
  ensureDir,
  readFile,
  readdirSync,
  statSync,
  stat,
  writeFile
} from "fs-extra";
import {TextDecoder} from "util";
import path from "path";
import tmp from "tmp";
import postcss from "postcss";
import postcssModules from "postcss-modules";
import less from "less";
import stylus from "stylus";
import resolve from "resolve";
const defaultOptions = {
  plugins: [],
  modules: true,
  rootDir: process.cwd(),
  sassOptions: {},
  lessOptions: {},
  stylusOptions: {},
  writeToFile: true
};
const postCSSPlugin = ({
  plugins = [],
  modules = true,
  rootDir = process.cwd(),
  sassOptions = {},
  lessOptions = {},
  stylusOptions = {},
  writeToFile = true,
  enableCache = false
} = defaultOptions) => ({
  name: "postcss2",
  setup(build) {
    const tmpDirPath = tmp.dirSync().name, modulesMap = [], cache = new Map();
    const modulesPlugin = postcssModules({
      generateScopedName: "[name]__[local]___[hash:base64:5]",
      ...typeof modules !== "boolean" ? modules : {},
      getJSON(filepath, json, outpath) {
        const mapIndex = modulesMap.findIndex((m) => m.path === filepath);
        if (mapIndex !== -1) {
          modulesMap[mapIndex].map = json;
        } else {
          modulesMap.push({
            path: filepath,
            map: json
          });
        }
        if (typeof modules !== "boolean" && typeof modules.getJSON === "function")
          return modules.getJSON(filepath, json, outpath);
      }
    });
    build.onResolve({filter: /.\.(css|sass|scss|less|styl)$/}, async (args) => {
      if (args.namespace !== "file" && args.namespace !== "")
        return;
      let sourceFullPath = resolve.sync(args.path, {
        basedir: args.resolveDir
      });
      const sourceExt = path.extname(sourceFullPath);
      if (sourceExt !== ".css" && sourceExt !== ".sass" && sourceExt !== ".scss" && sourceExt !== ".less" && sourceExt !== ".styl") {
        return;
      }
      const sourceBaseName = path.basename(sourceFullPath, sourceExt);
      const isModule = sourceBaseName.match(/\.module$/);
      const cacheVal = await queryCache(sourceFullPath, cache);
      if (cacheVal.outputPath === "") {
        let tmpFilePath = "";
        if (args.kind === "entry-point") {
          const sourceRelDir = path.relative(path.dirname(rootDir), path.dirname(sourceFullPath));
          tmpFilePath = path.resolve(tmpDirPath, sourceRelDir, `${sourceBaseName}.css`);
          await ensureDir(path.dirname(tmpFilePath));
        } else {
          const uniqueTmpDir = path.resolve(tmpDirPath, uniqueId());
          tmpFilePath = path.resolve(uniqueTmpDir, `${sourceBaseName}.css`);
        }
        await ensureDir(path.dirname(tmpFilePath));
        const fileContent = await readFile(sourceFullPath);
        let css = sourceExt === ".css" ? fileContent : "";
        if (sourceExt === ".sass" || sourceExt === ".scss") {
          const ret = await renderSass({
            ...sassOptions,
            file: sourceFullPath
          });
          css = ret.css.toString();
          cacheVal.depFiles = ret.stats.includedFiles;
        }
        if (sourceExt === ".styl") {
          css = await renderStylus(new TextDecoder().decode(fileContent), {
            ...stylusOptions,
            filename: sourceFullPath
          });
        }
        if (sourceExt === ".less") {
          const ret = await less.render(new TextDecoder().decode(fileContent), {
            ...lessOptions,
            filename: sourceFullPath,
            rootpath: path.dirname(args.path)
          });
          css = ret.css;
          cacheVal.depFiles = ret.imports;
        }
        const result = await postcss(isModule ? [modulesPlugin, ...plugins] : plugins).process(css, {
          from: sourceFullPath,
          to: tmpFilePath
        });
        cacheVal.depFiles = cacheVal.depFiles.concat(getPostCssDependencies(result.messages));
        cacheVal.outputPath = tmpFilePath;
        cacheVal.outputCss = result.css;
        if (enableCache) {
          cache.set(sourceFullPath, cacheVal);
          await updateDepFilesCache(cacheVal.depFiles, cache);
        }
        if (writeToFile) {
          await writeFile(tmpFilePath, result.css);
        }
      }
      return {
        namespace: isModule ? "postcss-module" : writeToFile ? "file" : "postcss-text",
        path: cacheVal.outputPath,
        watchFiles: [sourceFullPath].concat(cacheVal.depFiles),
        pluginData: {
          originalPath: sourceFullPath,
          css: cacheVal.outputCss
        }
      };
    });
    build.onLoad({filter: /.*/, namespace: "postcss-module"}, async (args) => {
      const mod = modulesMap.find(({path: path2}) => path2 === args?.pluginData?.originalPath), resolveDir = path.dirname(args.path), css = args?.pluginData?.css || "";
      return {
        resolveDir,
        contents: [
          writeToFile ? `import ${JSON.stringify(args.path)};` : null,
          `export default ${JSON.stringify(mod && mod.map ? mod.map : {})};`,
          writeToFile ? null : `export const stylesheet=${JSON.stringify(css)};`
        ].filter(Boolean).join("\n")
      };
    });
    build.onLoad({filter: /.*/, namespace: "postcss-text"}, async (args) => {
      const css = args?.pluginData?.css || "";
      return {
        contents: `export default ${JSON.stringify(css)};`
      };
    });
  }
});
function renderSass(options) {
  return new Promise((resolve2, reject) => {
    getSassImpl().render(options, (e, res) => {
      if (e)
        reject(e);
      else
        resolve2(res);
    });
  });
}
function renderStylus(str, options) {
  return new Promise((resolve2, reject) => {
    stylus.render(str, options, (e, res) => {
      if (e)
        reject(e);
      else
        resolve2(res);
    });
  });
}
function getSassImpl() {
  let impl = "sass";
  try {
    require.resolve("sass");
  } catch {
    try {
      require.resolve("node-sass");
      impl = "node-sass";
    } catch {
      throw new Error('Please install "sass" or "node-sass" package');
    }
  }
  return require(impl);
}
function getFilesRecursive(directory) {
  return readdirSync(directory).reduce((files, file) => {
    const name = path.join(directory, file);
    return statSync(name).isDirectory() ? [...files, ...getFilesRecursive(name)] : [...files, name];
  }, []);
}
let idCounter = 0;
function uniqueId() {
  return Date.now().toString(16) + (idCounter++).toString(16);
}
function getPostCssDependencies(messages) {
  let dependencies = [];
  for (const message of messages) {
    if (message.type == "dir-dependency") {
      dependencies.push(...getFilesRecursive(message.dir));
    } else if (message.type == "dependency") {
      dependencies.push(message.file);
    }
  }
  return dependencies;
}
async function queryCache(sourceFullPath, cache) {
  const fileStat = await stat(sourceFullPath);
  const newCacheVal = {
    lastMtimeMs: fileStat.mtimeMs,
    depFiles: [],
    outputPath: "",
    outputCss: ""
  };
  let cacheVal = cache.get(sourceFullPath);
  if (cacheVal === void 0) {
    return newCacheVal;
  }
  if (cacheVal.lastMtimeMs !== fileStat.mtimeMs) {
    return newCacheVal;
  }
  for (const depFile of cacheVal.depFiles) {
    const depCache = cache.get(depFile);
    if (depCache === void 0) {
      return newCacheVal;
    }
    const depFileStat = await stat(depFile);
    if (depCache.lastMtimeMs !== depFileStat.mtimeMs) {
      return newCacheVal;
    }
  }
  return cacheVal;
}
async function updateDepFilesCache(depFiles, cache) {
  for (const depFile of depFiles) {
    const fileStat = await stat(depFile);
    cache.set(depFile, {
      lastMtimeMs: fileStat.mtimeMs,
      depFiles: [],
      outputCss: "",
      outputPath: ""
    });
  }
}
var src_default = postCSSPlugin;
export {
  src_default as default,
  defaultOptions
};
