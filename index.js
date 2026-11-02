import express from "express";
import { MongoClient } from 'mongodb';
import cors from "cors";
import 'dotenv/config'
const app = express();
const PORT = 8000;

app.use(cors())
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("studioSpace");
const studiosCollection = db.collection("studios");

app.post("/add-studio", async (req, res) => {
  const data = req.body;
  const result = await studiosCollection.insertOne(data);
  console.log(result);
  res.send(result);
})


app.get("/", (req, res) => {
  res.send({message: 'Server is running fine!'});
})

//http://localhost:8000/

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
})