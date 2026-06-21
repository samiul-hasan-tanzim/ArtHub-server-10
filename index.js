require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const run = async () => {
    try {
        const database = client.db(process.env.DB_NAME);
        const artWorkCollections = database.collection(process.env.DB_ALL_COLLECTION);

        app.post('/api/artwork', async (req, res) => {
            const artWorkData = req.body
            const newArtWork = {
                ...artWorkData,
                createdAt: new Date()
            }
            const result = await artWorkCollections.insertOne(newArtWork)
            res.json(result)
        })

        console.log("MongoDB connected 🚀");
    } finally {
        // await client.close();
    }
};

run().catch(console.dir);

app.listen(port, () => {
    console.log("Server running on port", port);
});