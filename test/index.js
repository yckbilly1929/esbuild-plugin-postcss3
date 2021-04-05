const autoprefixer = require("autoprefixer"),
  { build } = require("esbuild"),
  postCSS = require("../dist"),
  { assert } = require("chai"),
  fs = require("fs");

describe("PostCSS esbuild tests", () => {
  it("Works with basic CSS imports", (done) => {
    test(["tests/basic.ts"])
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Works with preprocessors", (done) => {
    test(["tests/preprocessors.ts"])
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Works with CSS modules", (done) => {
    test(["tests/modules.ts"])
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Works with CSS as entrypoint", (done) => {
    test(["tests/styles.css", "tests/styles2.css"])
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Works with node_modules import", (done) => {
    test(["tests/node_modules.ts"])
      .then((res) => {
        assert(res);
        done();
      })
      .catch(done);
  });
  it("Works while waching css files", (done) => {
    let notTriggerTimeout = null;
    build({
      entryPoints: ["tests/watch.ts"],
      bundle: true,
      outdir: "dist",
      watch: {
        onRebuild: (error, result) => {
          notTriggerTimeout = null;
          if (error) return done(error);
          assert(result);
          done();
        }
      },
      plugins: [
        postCSS.default({
          plugins: [autoprefixer]
        })
      ]
    })
      .then(() => {
        // test if modifying the css actually triggers the onRebuild event
        const data = `.Test { display: block; }`;
        fs.writeFile("./styles/watch.css", data, (err) => {
          if (err) return done(err);
          notTriggerTimeout = setTimeout(() => {
            done("Watch file not triggered!");
          }, 1000);
        });
      })
      .catch(() => process.exit(1));
  });
});

function test(entryPoint) {
  return build({
    entryPoints: entryPoint,
    bundle: true,
    outdir: "dist",
    plugins: [
      postCSS.default({
        plugins: [autoprefixer]
      })
    ]
  }).catch(() => process.exit(1));
}
