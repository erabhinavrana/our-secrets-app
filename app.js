require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
// const encryption = require('mongoose-encryption');
const md5 = require('md5');

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

// userSchema.plugin(encryption, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

app.route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    req.body.password = md5(req.body.password);
    User.create(req.body, err => {
      if (!err) {
        res.render("secrets");
      } else {
        res.send(err);
      }
    });
  });

app.route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    // User.findOne({username: req.body.username}, (err, user) => {
    req.body.password = md5(req.body.password);
    User.findOne(req.body, (err, user) => {
      if (!err) {
        if (user) {
          // if (req.body.password === user.password) {
          //   res.render("secrets");
          // } else {
          //   res.send("Invalid Password!")
          // }
          res.render("secrets");
        } else {
          res.send("Invalid Credentials!")
        }
      } else {
        res.send(err);
      }
    });
  });

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.listen("3000", () => {
  console.log("Server started successfully!");
})
