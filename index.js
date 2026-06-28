require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;

const Stripe = require("stripe");
// const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
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



const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const JWKS = createRemoteJWKSet(
    new URL(`${process.env.NEXT_PUBLIC_CLIENT_URL}/api/auth/jwks`)
)
const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization

    if (!authHeader) {
        return res.status(401).json({
            message: 'Unauthorized'
        })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({
            message: 'Unauthorized'
        })
    }

    try {
        const { payload } = await jwtVerify(token, JWKS)
        // console.log('1', payload)
        next()
    } catch (error) {
        return res.status(403).json({
            message: 'Forbidden'
        })
    }
}





const run = async () => {
    try {
        const database = client.db(process.env.DB_NAME);
        const usersCollections = database.collection(process.env.DB_USERS);
        const artWorkCollections = database.collection(process.env.DB_ALL_COLLECTION);
        const commentsCollections = database.collection(process.env.DB_COMMENTS_COLLECTION);
        const ordersCollection = database.collection(process.env.DB_ORDERS_COLLECTION);
        const subscriptionPlansCollection = database.collection(process.env.DB_SUBSCRIPTION_PLAN_COLLECTION);
        const subscriptionCollection = database.collection(process.env.DB_SUBSCRIPTION_COLLECTION);

        app.post("/create-checkout-session", verifyToken, async (req, res) => {
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
                console.log('2', error);

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
                console.log('3', error);

                res.status(500).send({
                    message: "Failed to get session"
                });
            }
        });

        app.post("/orders", verifyToken, async (req, res) => {
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
                await artWorkCollections.updateOne(
                    {
                        _id: new ObjectId(orderData.artworkId)
                    },
                    {
                        $set: {
                            sold: true
                        }
                    }
                );

                res.send(result);

            } catch (error) {
                console.log('4', error);

                res.status(500).send({
                    message: "Failed to save order"
                });
            }
        });

        app.get('/orders', verifyToken, async (req, res) => {
            const query = {}

            if (req.query.buyerId) {
                query.buyerId = req.query.buyerId
            }
            if (req.query.artistId) {
                query.artistId = req.query.artistId
            }
            if (req.query.artworkId && req.query.artworkId !== "undefined") {
                query.artworkId = req.query.artworkId
            }

            const result = await ordersCollection.find(query).toArray()
            res.send(result)
        })


        app.get('/api/plans', verifyToken, async (req, res) => {
            const query = {}
            if (req.query.plan_id) {
                query.id = req.query.plan_id
            }
            const result = await subscriptionPlansCollection.findOne(query)

            res.send(result)
        })

        app.post('/api/subscriptions', verifyToken, async (req, res) => {
            // console.log("SUB API HIT");
            const data = req.body
            const subsInfo = {
                ...data,
                createdAt: new Date()
            }
            const result = await subscriptionCollection.insertOne(subsInfo)
            // console.log(result)
            const filter = { email: data.email };
            const updateDocument = {
                $set: {
                    plan: data.planId,
                },
            };
            const updateResult = await usersCollections.updateOne(filter, updateDocument)
            res.send(updateResult)
        })




        app.post('/api/artwork', verifyToken, async (req, res) => {
            const artWorkData = req.body
            const newArtWork = {
                ...artWorkData,
                createdAt: new Date()
            }
            const result = await artWorkCollections.insertOne(newArtWork)
            res.json(result)
        })

        app.get("/api/artwork", async (req, res) => {
            const query = {};

            const {
                artistId,
                status,
                search,
                category,
                sort,
                page,
                limit
            } = req.query;

            if (artistId) {
                query.artistId = artistId;
            }

            if (status) {
                query.status = status;
            }

            if (search) {
                query.$or = [
                    {
                        artName: {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        artistName: {
                            $regex: search,
                            $options: "i"
                        }
                    }
                ];
            }

            if (category) {
                query.category = category;
            }

            let sortOption = {
                createdAt: -1
            };

            if (sort === "low") {
                sortOption = {
                    price: 1
                };
            }

            if (sort === "high") {
                sortOption = {
                    price: -1
                };
            }

            const currentPage = Number(page) || 1;
            const artworkLimit = Number(limit) || 9;

            const totalArtworks = await artWorkCollections.countDocuments(query);
            const totalPages = Math.ceil(totalArtworks / artworkLimit);

            const result = await artWorkCollections
                .find(query)
                .sort(sortOption)
                .skip((currentPage - 1) * artworkLimit)
                .limit(artworkLimit)
                .toArray();

            res.send({
                artworks: result,
                totalPages
            });
        });

        app.get('/api/artwork/:id', async (req, res) => {
            const { id } = req.params;

            const artwork = await artWorkCollections.findOne({
                _id: new ObjectId(id)
            });

            if (!artwork) {
                return res.status(404).send({
                    message: "Artwork not found"
                });
            }

            res.send(artwork);
        });

        app.patch('/api/artwork/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const updatedDAta = req.body
            const result = await artWorkCollections.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedDAta }
            )
            res.json(result)
        })

        app.delete('/api/artwork/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const result = await artWorkCollections.deleteOne({ _id: new ObjectId(id) })
            res.json(result)
        })




        app.get('/api/user/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const user = await usersCollections.findOne({ _id: new ObjectId(id) })
            res.send(user)
        })

        app.get("/api/users", verifyToken, async (req, res) => {
            const result = await usersCollections.find().toArray();
            res.send(result);
        });


        app.patch("/api/user/role/:id", verifyToken, async (req, res) => {
            try {
                const { id } = req.params;
                const { role } = req.body;

                const result = await usersCollections.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: { role }
                    }
                );

                res.send(result);

            } catch (error) {
                console.log('9', error);

                res.status(500).send({
                    message: "Failed to update role"
                });
            }
        });

        app.patch("/api/artwork/status/:id", verifyToken, async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;

                const result = await artWorkCollections.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            status
                        }
                    }
                );

                res.send(result);

            } catch (error) {
                console.log('10', error);

                res.status(500).send({
                    message: "Failed to update artwork status"
                });
            }
        });



        app.post('/api/comments', verifyToken, async (req, res) => {
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

        app.delete("/api/comments/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await commentsCollections.deleteOne({
                _id: new ObjectId(id)
            });
            res.send(result);
        });

        app.patch("/api/comments/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const { comment } = req.body;

            const result = await commentsCollections.updateOne(
                { _id: new ObjectId(id) },
                { $set: { comment } }
            );
            res.send(result);
        });



        app.patch('/api/user/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const data = req.body

            const result = await usersCollections.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        name: data.name,
                        image: data.image
                    }
                }
            )

            res.send(result)
        })




        app.patch("/api/user/init/:email", verifyToken, async (req, res) => {
            const { email } = req.params;

            const user = await usersCollections.findOne({ email });

            if (!user) {
                return res.status(404).send({
                    message: "User not found"
                });
            }

            if (!user.role || !user.plan) {
                const result = await usersCollections.updateOne(
                    { email },
                    {
                        $set: {
                            role: "user",
                            plan: "free_user"
                        }
                    }
                );

                return res.send(result);
            }

            res.send({
                message: "Already initialized"
            });
        });


        console.log("MongoDB connected 🚀");
    } finally {
        // await client.close();
    }
};

run().catch(console.dir);

app.listen(port, () => {
    console.log("Server running on port", port);
});