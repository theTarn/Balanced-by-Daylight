module.exports = function(app) {

    // Scripts and stylesheets are cached for 30 days, so their URLs carry the server start time.
    // A new deploy restarts the server, which makes browsers fetch the new files.
    app.locals.assetVersion = Date.now();

    // The checker is the start page. Keep the query string so shared links (?balancing=, ?loadout=) still work.
    app.get('/', (req, res) => {
        const query = req.originalUrl.indexOf("?");
        res.redirect("/balance-checker" + (query == -1 ? "" : req.originalUrl.slice(query)));
    })

    app.get('/balance-creator', (req, res) => {
        res.render("balance-creator.pug", { mode: "create" });
    })

    app.get('/balance-checker', (req, res) => {
        res.render("balance-checker.pug", { mode: "check" });
    })
}
