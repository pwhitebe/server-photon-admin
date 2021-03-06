 var express = require('express')
     , passport = require('passport')
  , flash = require('connect-flash')
  , util = require('util')
  , LocalStrategy = require('passport-local').Strategy
, BearerStrategy = require('passport-http-bearer').Strategy;
    article = require('./routes/articles');
users = require('./routes/users');
var mongo = require('mongodb');
var monk = require('monk');
 
//var Server = mongo.Server,
//    Db = mongo.Db,
//    BSON = mongo.BSONPure;
 
var app = express();
var db = monk('localhost:27017/userdb');
var userdb = db.get('users');
//var server = new Server('localhost', 27017, {auto_reconnect: true});
//var userdb = new Db('userdb', server);
//var users = [
 //   { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com', token: '123456789' }
//  , { id: 2, username: 'joe', password: 'birthday', email: 'joe@example.com', token: '987654321' }
//];

function findById(id, fn) {
  //var idx = id - 1;
  //if (userdb[idx]) {
  //  fn(null, users[idx]);
  //} else {
   // fn(new Error('User ' + id + ' does not exist'));
  //}
   userdb.findById(id, function(err,user){
                if(err) done(err);
                done(null,user);
            });
}

function findByUsername(username, fn) {
//  for (var i = 0, len = users.length; i < len; i++) {
//    var user = users[i];
//    if (user.username === username) {
//      return fn(null, user);
//    }
//  }
//  return fn(null, null);
userdb.findOne({ username : username},function(err,user, done){
   console.log('found user: ' + username + ", the user id is " + user.id);
       
//        if(err) { return done(err); }
//        if(!user){
//            console.log('apparently there was no user' + user);
//            return done({ message: 'Incorrect username.' });
//        }
        return user;
});
};

function findByToken(token, fn) {
//  for (var i = 0, len = users.length; i < len; i++) {
//    var user = users[i];
//    if (user.token === token) {
//      return fn(null, user);
//    }
//  }
//  return fn(null, null);
userdb.findOne({ token : token},function(err,user, done){
    console.log("token was " + token)
        if(err) { return done(err); }
        if(!user){
            return done(null, false, { message: 'Nonexistant token.' });
        }
        return user;
})
};

// Use the BearerStrategy within Passport.
//   Strategies in Passport require a `validate` function, which accept
//   credentials (in this case, a token), and invoke a callback with a user
//   object.
passport.use(new BearerStrategy({
  },
  function(token, done) {
    // asynchronous validation, for effect...
    process.nextTick(function () {
      
      // Find the user by token.  If there is no user with the given token, set
      // the user to `false` to indicate failure.  Otherwise, return the
      // authenticated `user`.  Note that in a production-ready application, one
      // would want to validate the token for authenticity.
      findByToken(token, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        return done(null, user);
      })
    });
  }
));


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password !== password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      
      
      })
    });
  }
));

 
app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.engine('ejs', require('ejs-locals'));
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    app.use(express.cookieParser());
     app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(flash());
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/../../public'));
});
 
app.get('/articles', passport.authenticate('bearer', { session: false }),
        article.findAll);
app.get('/articles/:id', article.findById);
app.post('/articles', article.addArticle);
app.put('/articles/:id', article.updateArticle);
app.delete('/articles/:id', article.deleteArticle);

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('error') });
});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/foo',
  // Authenticate using HTTP Bearer credentials, with session support disabled.
  passport.authenticate('bearer', { session: false }),
  function(req, res){
    res.json({ username: req.user.username, email: req.user.email });
  });
  
// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
/*
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.flash('error', info.message);
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/users/' + user.username);
    });
  })(req, res, next);
});
*/

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


app.listen(8081);
console.log('Listening on port 8081...');

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
};