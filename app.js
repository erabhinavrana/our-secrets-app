require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
// const encryption = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String
});

// userSchema.plugin(encryption, { secret: process.env.SECRET, encryptedFields: ["password"] });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets for saving the session in cookies.
    res.redirect("/secrets");
});

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/facebook",
  passport.authenticate("facebook", { scope: ["public_profile"] })
);

app.get("/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets for saving the session in cookies.
    res.redirect("/secrets");
});


app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
})

app.route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    // req.body.password = md5(req.body.password);
    // bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    //   if (!err) {
    //     req.body.password = hash;
    //     User.create(req.body, err => {
    //       if (!err) {
    //         res.render("secrets");
    //       } else {
    //         res.send(err);
    //       }
    //     });
    //   }else{
    //     res.send("Error in creating the hash!")
    //   }
    // });

    User.register({username: req.body.username}, req.body.password, (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    });

  });

app.route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    // User.findOne({username: req.body.username}, (err, user) => {
    // req.body.password = md5(req.body.password);

    // User.findOne({username: req.body.username}, (err, user) => {
    //   if (!err) {
    //     if (user) {
    //       // if (req.body.password === user.password) {
    //       //   res.render("secrets");
    //       // } else {
    //       //   res.send("Invalid Password!")
    //       // }
    //       bcrypt.compare(req.body.password, user.password, (err, result) => {
    //         if (result) {
    //           res.render("secrets");
    //         } else {
    //           res.send("Incorrect Password!")
    //         }
    //       });
    //     } else {
    //       res.send("Invalid Credentials!")
    //     }
    //   } else {
    //     res.send(err);
    //   }
    // });
    const user = new User(req.body);
    req.login(user, err => {
      if (!err) {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      } else {
        console.log(err);
      }
    });
  });

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.listen("3000", () => {
  console.log("Server started successfully!");
})
