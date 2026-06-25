require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


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
        const commentsCollections = database.collection(process.env.DB_COMMENTS_COLLECTION);
        const ordersCollection = database.collection(process.env.DB_ORDERS_COLLECTION);

        app.post("/create-checkout-session", async (req, res) => {
            // console.log("BODY:", req.body);
            try {
                const { artName, price, buyerId, buyerEmail, artworkId, artistId, artistName } = req.body;

                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ["card"],

                    line_items: [
                        {
                            price_data: {
                                currency: "usd",

                                product_data: {
                                    name: artName
                                },

                                unit_amount: price * 100
                            },

                            quantity: 1
                        }
                    ],

                    mode: "payment",

                    metadata: {
                        buyerId,
                        buyerEmail,
                        artworkId,
                        artworkName: artName,
                        artistId,
                        artistName,
                        price: String(price)
                    },

                    success_url: `${process.env.NEXT_PUBLIC_CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,

                    cancel_url: `${process.env.NEXT_PUBLIC_CLIENT_URL}/payment-cancel`
                });

                res.send({
                    url: session.url
                });

            } catch (error) {
                console.log(error);

                res.status(500).send({
                    message: "Payment failed"
                });
            }
        });

        app.get("/checkout-session/:sessionId", async (req, res) => {
            try {
                const { sessionId } = req.params;

                const session = await stripe.checkout.sessions.retrieve(sessionId);

                res.send(session);

            } catch (error) {
                console.log(error);

                res.status(500).send({
                    message: "Failed to get session"
                });
            }
        });

        app.post("/orders", async (req, res) => {
            try {
                const orderData = req.body;

                const alreadyExists = await ordersCollection.findOne({
                    stripeSessionId: orderData.stripeSessionId
                });

                if (alreadyExists) {
                    return res.send({
                        message: "Order already saved"
                    });
                }

                const result = await ordersCollection.insertOne(orderData);

                res.send(result);

            } catch (error) {
                console.log(error);

                res.status(500).send({
                    message: "Failed to save order"
                });
            }
        });

        app.get('/orders', async (req, res) => {
            const query = {}
            if (req.query.buyerId) {
                query.buyerId = req.query.buyerId
            }
            if (req.query.artworkId && req.query.artworkId !== "undefined") {
                query.artworkId = req.query.artworkId
            }
            const cursor = ordersCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })





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


        app.post('/api/comments', async (req, res) => {
            const commentsData = req.body
            const newComments = {
                ...commentsData,
                createdAt: new Date()
            }
            const result = await commentsCollections.insertOne(newComments)
            res.json(result)
        })

        app.get('/api/comments', async (req, res) => {
            const query = {}
            if (req.query.artWorkId) {
                query.artWorkId = req.query.artWorkId
            }
            const cursor = commentsCollections.find(query)
            const result = await cursor.toArray()
            res.send(result)
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