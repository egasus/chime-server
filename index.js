let express = require("express");
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let apiRoutes = require("./api-routes");
let app = express();

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS,POST,PUT,DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Authentication"
  );
  next();
});

// db connect
mongoose.connect("mongodb://localhost/resthub", { useNewUrlParser: true });
var db = mongoose.connection;

if (!db) {
  console.log("Error connecting db");
} else {
  console.log("DB connected successfully");
}

// Setup server port
var port = process.env.PORT || 8080;

app.get("/", (req, res) => res.send("Hello World with Express"));
app.use("/api", apiRoutes);

// Launch app to listen to specified port
app.listen(port, function () {
  console.log("Running RestHub on port " + port);
});
