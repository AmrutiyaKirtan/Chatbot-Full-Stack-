const OpenAI = require('openai');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const Message = require('./models/message');
const Conversation = require('./models/conversation');

const MONGO_URI = "mongodbURL"
const OPENAI_API_KEY = "your_api_key_here7"

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

app.post('/message/:id', async (req, res) => {
  try {
    if (req.params.id === 'new') {
      const newConversation = await new Conversation().save();
      const userMessage = await new Message({
        role: 'user',
        content: req.body.message.content,
        conversation: newConversation._id,
      }).save();

      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [req.body.message],
      });

      const assistantMessage = await new Message({
        role: 'assistant',
        content: chatCompletion.choices[0].message.content,
        conversation: newConversation._id,
      }).save();

      res.send({
        message: chatCompletion.choices[0].message.content,
        conversation: newConversation._id,
      });
    } else {
      const existingConversation = await Conversation.findById(req.params.id);
      const messages = await Message.find({ conversation: existingConversation._id })
        .sort({ timestamp: -1 })
        .limit(5);

      const userMessage = await new Message({
        role: 'user',
        content: req.body.message.content,
        conversation: existingConversation._id,
      }).save();

      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [...messages.map(message => ({ content: message.content, role: message.role })).reverse(), req.body.message],
      });

      const assistantMessage = await new Message({
        role: 'assistant',
        content: chatCompletion.choices[0].message.content,
        conversation: existingConversation._id,
      }).save();

      res.send({ message: chatCompletion.choices[0].message.content });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/conversation/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    const messages = await Message.find({ conversation: conversation._id });
    res.send({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/conversation/:id', async (req, res) => {
  try {
    await Message.deleteMany({ conversation: req.params.id });
    await Conversation.findByIdAndDelete(req.params.id);
    res.send({ message: 'Conversation deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// http://127.0.0.1:3000/message/new

