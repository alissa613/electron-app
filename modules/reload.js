const { app } = require("electron");
const chokidar = require("chokidar");
const ignoredPaths = /node_nodules|[/\\]./;
const mainFile = module.parent.filename;

module.exports = (glob, options = {}) => {
    const browserWindows = [];
    const watcher = chokidar.watch(
        glob,
        Object.assign({ ignored: [ignoredPaths, mainFile] }, options)
    );

    const softResetHandler = () => {
        console.log("Renderer change detected - soft reloading");
        browserWindows.forEach((bw) => bw.webContents.reloadIgnoringCache());
    };

    app.on("browser-window-created", (e, bw) => {
        browserWindows.push(bw);

        bw.on("closed", function () {
            const i = browserWindows.indexOf(bw);
            browserWindows.splice(i, 1);
        });
    });

    watcher.on("change", softResetHandler)
}