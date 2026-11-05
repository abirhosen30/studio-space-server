import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
const app = express();
const PORT = 8000;

app.use(cors());
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
const bookingsCollection = db.collection("bookings");

app.post("/add-studio", async (req, res) => {
  const data = req.body;
  const result = await studiosCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

app.get("/studios", async (req, res) => {
  const result = await studiosCollection.find({}).toArray();
  res.send(result);
});

app.get("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const data = await studiosCollection.findOne({ _id: new ObjectId(id) });
  res.send(data);
});

app.patch("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const result = await studiosCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: data },
  );
  res.json(result);
});

app.delete("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const result = await studiosCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.get("/", (req, res) => {
  res.send({ message: "Server is running fine!" });
});

app.post("/booking", async (req, res) => {
  const { _id: studioId, ...bookingData } = req.body;
  const result = await bookingsCollection.insertOne({
    ...bookingData,
    studioId,
    status: "Pending",
  });
  res.send(result);
});

app.get("/my-bookings/:email", async (req, res) => {
  const { email } = req.params;
  const result = await bookingsCollection.find({ email: email }).toArray();
  res.send(result);
});

app.delete("/my-bookings/:id", async (req, res) => {
  const { id } = req.params;
  const email = req.query.email;

  if (!ObjectId.isValid(id) || typeof email !== "string" || !email.trim()) {
    return res
      .status(400)
      .json({ message: "A valid booking ID and email are required." });
  }

  const result = await bookingsCollection.deleteOne({
    _id: new ObjectId(id),
    email: email.trim(),
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Booking not found." });
  }

  res.json({ deleted: true });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
