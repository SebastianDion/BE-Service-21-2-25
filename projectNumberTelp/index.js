const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');  
const { Kafka } = require('kafkajs');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Ini mySql Connection
const database = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

//Kafka Producer
const kafka = new Kafka({
  clientId: 'phone-service',
  brokers:['localhost:9092']
});
const producer = kafka.producer();

const runProducer = async (phone)=>{
  await producer.connect();
  await producer.send({
    topic: 'phone-numbers',
    messages: [{ value: phone }]
  });
  await producer.disconnect();
}

app.post('/submit', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
  }

  const query = 'INSERT INTO user (nomorTelp) VALUES (?)';
  database.query(query, [phone], async (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error" });
      }
      await runProducer(phone);
      res.json({ message: "Phone number inserted successfully" });
  });
});

app.get('/', (req, res) => {
  const sqlQuery = 'SELECT * FROM user';
  database.query(sqlQuery, (err, result) => {
    if (err) throw err;
    res.json({ 'Phone': result });
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);  
});
