import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
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

function studioIdFilter(id) {
  const filters = [{ _id: id }];

  if (ObjectId.isValid(id)) {
    filters.push({ _id: new ObjectId(id) });
  }

  return { $or: filters };
}

function studioOwnerFilter(email) {
  return {
    $or: [{ ownerEmail: email }, { accountEmail: email }],
  };
}

const verifyToken = async (req, res, next) => {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
  const token = match?.[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

  try {
    const { payload } = await jwtVerify(token, JWKS);
    if (typeof payload.email !== "string" || !payload.email.trim()) {
      return res.status(401).json({ message: "Invalid account token." });
    }

    req.auth = {
      email: payload.email.trim().toLowerCase(),
      name: typeof payload.name === "string" ? payload.name : "",
      image: typeof payload.image === "string" ? payload.image : "",
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

app.post("/add-studio", verifyToken, async (req, res) => {
  const data = {
    ...req.body,
    providerName: req.auth.name,
    accountEmail: req.auth.email,
    ownerEmail: req.auth.email,
  };
  const result = await studiosCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

app.get("/studios", async (req, res) => {
  const result = await studiosCollection.find({}).toArray();
  res.send(result);
});

app.get("/featured-studios", async (req, res) => {
  const result = await studiosCollection
    .find({})
    .sort({ _id: -1 })
    .limit(6)
    .toArray();
  res.json(result);
});

app.get("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const data = await studiosCollection.findOne(studioIdFilter(id));
  res.send(data);
});

app.patch("/studios/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    stageTitle,
    deliveryCategory,
    capacity,
    hourlyRate,
    securityDeposit,
    geoAddress,
    mediaLibraryUrl,
    presetChips,
    hardware,
    notes,
    amenities,
    galleryImages,
    mediaLibraryUrls,
    gallery,
  } = req.body;
  const data = {
    stageTitle,
    deliveryCategory,
    capacity,
    hourlyRate,
    securityDeposit,
    geoAddress,
    mediaLibraryUrl,
    presetChips,
    hardware,
    notes,
    amenities,
    galleryImages,
    mediaLibraryUrls,
    gallery,
  };
  const result = await studiosCollection.updateOne(
    {
      $and: [studioIdFilter(id), studioOwnerFilter(req.auth.email)],
    },
    { $set: data },
  );
  res.json(result);
});

app.delete("/studios/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await studiosCollection.deleteOne({
    $and: [studioIdFilter(id), studioOwnerFilter(req.auth.email)],
  });
  res.json(result);
});

app.get("/my-studios", verifyToken, async (req, res) => {
  const studios = await studiosCollection
    .find(studioOwnerFilter(req.auth.email))
    .sort({ _id: -1 })
    .toArray();

  res.json(studios);
});

app.get("/", (req, res) => {
  res.send({ message: "Server is running fine!" });
});

app.post("/booking", verifyToken, async (req, res) => {
  const { _id: studioId, ...bookingData } = req.body;
  const result = await bookingsCollection.insertOne({
    ...bookingData,
    studioId,
    username: req.auth.name,
    email: req.auth.email,
    image: req.auth.image,
    status: "Pending",
  });
  res.send(result);
});

app.get("/my-bookings/:email", verifyToken, async (req, res) => {
  const requestedEmail = decodeURIComponent(req.params.email)
    .trim()
    .toLowerCase();

  if (requestedEmail !== req.auth.email) {
    return res
      .status(403)
      .json({ message: "You can only view your own bookings." });
  }

  const result = await bookingsCollection
    .find({ email: req.auth.email })
    .sort({ bookingDate: -1 })
    .toArray();
  res.send(result);
});

app.delete("/my-bookings/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "A valid booking ID is required." });
  }

  const result = await bookingsCollection.deleteOne({
    _id: new ObjectId(id),
    email: req.auth.email,
    status: "Pending",
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Booking not found." });
  }

  res.json({ deleted: true });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

export default app;
