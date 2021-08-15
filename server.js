const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
let mongo = require("mongodb");

let MongoClient = mongo.MongoClient;
const uri = `mongodb+srv://lautarojgarcia177:${process.env.MONGODBATLASPASSWORD}@freecodecamptuotrialclu.na94p.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
let dbo;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  if (err) throw err;
  dbo = client.db("fccexercisetracker").collection("users");
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res, next) => {
  try {
    let allUsers = await dbo.find().toArray();
    res.json(allUsers);
  } catch (err) {
    console.error(err);
    res.status(500).send("There was an error");
  }
});

app.post("/api/users", (req, res, next) => {
  dbo.findOne({ username: req.body.username }, function (err, usernameTaken) {
    if (err) throw err;
    if (!!usernameTaken) {
      res.send("Username already taken");
    } else {
      const newUser = { username: req.body.username };
      dbo.insertOne(newUser, function (errorr, insertedUser) {
        if (errorr) throw errorr;
        dbo.findOne({ _id: insertedUser.insertedId }, function (error, user) {
          if (error) throw error;
          res.json(user);
        });
      });
    }
  });
});

app.post("/api/users/:_id/exercises", function (req, res, next) {
  if (!req.body.duration) res.status(400).send('Path `duration` is required.');
  if (!req.body.description) res.status(400).send('Path `description` is required.');
  const userId = new mongo.ObjectId(req.params._id);
  dbo.findOne({ _id: userId }, async function (err, user) {
    if (err) throw err;
    if (!!user) {
      let exercise = {
        date: !!req.body.date ? new Date(req.body.date) : Date.now(),
        duration: Number(req.body.duration),
        description: req.body.description,
      };
      if (user.log) {
        user.log.push(exercise);
      } else {
        user.log = [exercise];
      }
      const replacedUser = await dbo.findOneAndReplace({ _id: userId }, user);
      const formattedDate = new Date(exercise.date).toDateString();
      exercise.date = formattedDate;
      const response = {
        _id: replacedUser.value._id,
        username: replacedUser.value.username,
        ...exercise,
      };
      res.json(response);
    } else {
      res.send("Unknown userId");
    }
  });
});

app.get("/api/users/:id/logs", function (req, res, next) {
  const userId = new mongo.ObjectId(req.params.id);
  const queryOptions = {};
  if (req.query.limit) Object.assign(queryOptions, { $limit: req.query.limit });
  dbo.findOne({ _id: userId }, queryOptions, function (err, user) {
    if (err) throw err;
    let log = [];
    if (user.log) {
      log = user.log;
      if (req.query.from) {
        try {
          const fromDate = new Date(req.query.from);
          log = user.log.filter((ex) => {
            const exerciseDate = new Date(ex.date);
            return exerciseDate.getTime() >= fromDate.getTime();
          });
        } catch (erroraso) {
          console.error(erroraso);
          throw erroraso;
        }
      }
      if (req.query.to) {
        try {
          const fromDate = new Date(req.query.to);
          log = user.log.filter((ex) => {
            const exerciseDate = new Date(ex.date);
            return exerciseDate.getTime() <= fromDate.getTime();
          });
        } catch (erroraso) {
          console.error(erroraso);
          throw erroraso;
        }
      }
      if (req.query.limit) log = user.log.slice(0, req.query.limit);
    }
    const response = {
      ...user,
      count: log.length,
      log,
    };
    res.json(response);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
