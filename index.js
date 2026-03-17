var express = require("express");
const path = require("path");
const PORT = process.env.PORT || 4000;
const bodyParser = require("body-parser");
const session = require("express-session");
var router = require("./routes/routes");

var app = express()
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true in production with HTTPS
      maxAge: 3600000 // 1 hour
    }
  }))
  .use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs");

router(app);

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
