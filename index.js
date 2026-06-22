require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const usersCollections = database.collection(process.env.DB_USERS);
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

        app.get('/api/artwork', async (req, res) => {
            const query = {}
            if (req.query.artistId) {
                query.artistId = req.query.artistId
            }
            if (req.query.status) {
                query.status = req.query.status
            }
            const cursor = artWorkCollections.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/api/artwork/:id', async (req, res) => {
            const { id } = req.params
            const user = await artWorkCollections.findOne({ _id: new ObjectId(id) })
            res.send(user)
        })

        app.patch('/api/artwork/:id', async (req, res) => {
            const { id } = req.params
            const updatedDAta = req.body
            const result = await artWorkCollections.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedDAta }
            )
            res.json(result)
        })

        app.delete('/api/artwork/:id', async (req, res) => {
            const { id } = req.params
            const result = await artWorkCollections.deleteOne({ _id: new ObjectId(id) })
            res.json(result)
        })



        // app.get('/api/user', async (req, res) => {
        //     const query = {}
        //     if (req.query.userId) {
        //         query._id = new ObjectId(req.query.userId)
        //     }
        //     const result = await usersCollections.find(query).toArray()
        //     res.send(result)
        // })
        app.get('/api/user/:id', async (req, res) => {
            const { id } = req.params
            const user = await usersCollections.findOne({ _id: new ObjectId(id) })
            res.send(user)
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