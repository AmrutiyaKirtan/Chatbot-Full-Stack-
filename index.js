let openai = require('openai');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const message = require('./models/message');
const conversation = require('./models/conversation');
const { Timestamp } = require('mongodb');

MONGO_URI="mongodb+srv://papadragonyt:9510941315@cluster0.po4dsm2.mongodb.net/"
OPENAPI_API_KEY="sk-proj-m6JuP96TyIxNahC5kMagT3BlbkFJqxukX7RREI76pltmvzNC"

mongoose.connect(MONGO_URI);

const db = mongoose.connection;

const app = express();
app.use(bodyParser.json());
app.use(cors());

openai = require('openai');
openai.apiKey = OPENAPI_API_KEY;


app.post('/message/:id', (req, res) => {
  if (req.params.id === 'new') {
    new conversation().save().then((conversation) => {
      new Message(
        {
          role: 'user',
          content: req.body.message.content,
          conversation: conversation._id
        }
      ).save().then(() => {
        openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [req.body.message]
        }).then((data) => {
          new Message({
            role: 'assistant',
            content: data.data.choices[0].message.content,
            conversation: conversation._id
          }).save().then(() => {
            res.send({
              message: data.data.choices[0].message.content,
              conversation: conversation._id
            })
          })
        })
      })
    })
  } else {
    conversation.findById(req.params.id).then((conversation) => {
      Message.find({ conversation: conversation._id }).sort({ timestamp: -1 }).limit(5).then((messages) => {
        new Message({
          role: 'user',
          content: req.body.message.content,
          conversation: conversation._id
        }).save().then(() => {
          openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [...messages.map((message => { return { content: message.content, role: message.role } })).reverse(), req.body.message]
          }).then((data) => {
            new Message({
              role: 'assistant',
              content: data.data.choices[0].message.content,
              conversation: conversation._id
            }).save().then(() => {
              res.send({ message: data.data.choices[0].message.content })
            })
          })
        })
      })
    })
  }
})


app.get('/conversation/:id', (req, res) => {
  conversation.findById(req.params.id).then((conversation) => {
    message.find({ conversation: conversation._id }).then((messages) => {
      res.send({ messages})
    })
  })
});

app.delete('/conversation/:id', (req, res) => {
  message.deleteMany({conversation: req.params.id}).then(()=>{
    Conversation.findByIdAndDelete(req.params.id).then(()=>{
      res.send({message: 'conversation deleted'})
    })
  })
})

app.listen(5500, () => {
  console.log('Server started on port 5500');
})













// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://papadragonyt:9510941315@cluster0.po4dsm2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);
