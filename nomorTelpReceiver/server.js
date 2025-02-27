const express = require('express');
const mysql = require('mysql2');
const { Kafka } = require('kafkajs');
require('dotenv').config();



const app = express();
app.use(express.json());

const database = mysql.createConnection({
  host: process.env.SECOND_DB_HOST,
  user: process.env.SECOND_DB_USER,
  password: process.env.SECOND_DB_PASSWORD,
  database: process.env.SECOND_DB_NAME,
  port: process.env.SECOND_DB_PORT
});
const cors = require("cors");
app.use(cors()); 
const kafka = new Kafka({
  clientId: 'phone-consumer',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'phone-group' });

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({topic:'phone-numbers',
    fromBeginning: true
  });

  

  await consumer.run({
    eachMessage: async ({ message }) =>{
      const phone = message.value.toString();
      console.log(`Received phone number: ${phone}`);

      const query = 'INSERT INTO second_user (nomorTelp) VALUES (?)';

      database.query(query, [phone], (err, result) => {
        if (err) {
          console.error("Error inserting into second DB:", err);
        } else {
          console.log("Phone number saved to second database");
        }
      });
    }

  })
}

app.get("/", (req, res) => {
  const sqlQuery = "SELECT * FROM second_user";
  database.query(sqlQuery, (err, result) => {
    if (err) {
      console.error("Error fetching data from second DB:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ Phone: result });
  });
});


runConsumer().catch(console.error);

const port = 4000;
app.listen(port, () => {
  console.log(`Second backend listening on port ${port}`);
});
