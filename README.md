# ArtHub Server — Contemporary Art Platform API Backend

A robust, high-performance Express.js backend designed for **ArtHub**—a contemporary art platform and gallery. It handles role-based validation, manages individual artwork transactions and subscription upgrades via Stripe, persists all system data to MongoDB, and implements secure remote JWT validation using JSON Web Key Sets (JWKS).

---

## 🛠️ Technology Stack & Architecture

- **Runtime & Framework**: Node.js & [Express.js 5](https://expressjs.com/)
- **Database Engine**: [MongoDB](https://www.mongodb.com/) (using the official MongoDB Node.js Driver)
- **Payments Gateway**: [Stripe API SDK](https://stripe.com/docs/api)
- **Security & Cryptography**: [jose-cjs](https://github.com/panva/jose) (JSON Web Signatures, Tokens, and Keys)
- **Cross-Origin Resource Sharing**: CORS middleware

---

## 🔒 Security & JWT Verification

The backend secures sensitive endpoints using a custom middleware function: `verifyToken`. 

Instead of storing secrets locally or sharing database sessions directly, the server acts as a cryptographic client. It downloads and caches the public keys from the client-side authentication provider (Better Auth) using a **JSON Web Key Set (JWKS)** endpoint.

```javascript
const JWKS = createRemoteJWKSet(
    new URL(`${process.env.NEXT_PUBLIC_CLIENT_URL}/api/auth/jwks`)
)
```

### Authentication Flow:
1. The client logs in via Better Auth and obtains a session JWT.
2. For protected requests, the client attaches this token in the header as: `Authorization: Bearer <JWT>`.
3. The server interceptor (`verifyToken`) extracts the token, fetches/caches the keys from the JWKS URL, verifies the signature, and allows the request if valid.

---

## 🗄️ Database Schema & Collections

ArtHub relies on a MongoDB database configured via the environment. Below are the collections utilized:

| Environment Variable | Default Collection Name | Purpose |
|----------------------|-------------------------|---------|
| `DB_USERS` | `user` | Stores details of admins, artists, and art collectors (users). |
| `DB_ALL_COLLECTION` | `artworks` | Holds all listed artworks including title, price, status, and owner. |
| `DB_COMMENTS_COLLECTION` | `comments` | Collects customer reflections (reviews) mapped to artwork IDs. |
| `DB_ORDERS_COLLECTION` | `orders` | Keeps logs of all individual artwork purchases. |
| `DB_SUBSCRIPTION_PLAN_COLLECTION` | `subscription_plans` | Manages metadata, pricing, and limits of the subscription tiers. |
| `DB_SUBSCRIPTION_COLLECTION` | `subscriptions` | Logs active subscriptions purchased by collectors. |

---

## 🚀 API Endpoint Reference

### 💳 Stripe Payments & Orders
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| **POST** | `/create-checkout-session` | 🔒 | Initiates a Stripe Checkout Session for buying an artwork. |
| **GET** | `/checkout-session/:sessionId` | 🌐 | Retrieves details of a specific Stripe Checkout Session. |
| **POST** | `/orders` | 🔒 | Registers a successful artwork order, updating the artwork status to `sold: true`. |
| **GET** | `/orders` | 🔒 | Retrieves list of orders. Supports query parameters `buyerId`, `artistId`, and `artworkId` to filter results. |

### 💎 Membership Subscriptions
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| **GET** | `/api/plans` | 🔒 | Fetches a subscription plan configuration. Supports filtering by `plan_id`. |
| **POST** | `/api/subscriptions` | 🔒 | Registers a membership purchase. Updates the user's plan inside the users collection. |

### 🎨 Artworks Management
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/artwork` | 🔒 | Submits a new artwork entry. |
| **GET** | `/api/artwork` | 🌐 | Retrieves paginated and filtered artworks. Query filters: `artistId`, `status`, `search` (matches titles/artists), `category`, `sort` (`low`/`high`), `page`, and `limit`. |
| **GET** | `/api/artwork/:id` | 🌐 | Fetches details of a specific artwork by ID. |
| **PATCH** | `/api/artwork/:id` | 🔒 | Modifies details of an existing artwork. |
| **DELETE** | `/api/artwork/:id` | 🔒 | Deletes an artwork entry. |
| **PATCH** | `/api/artwork/status/:id` | 🔒 | Updates artwork status (e.g. `pending`, `active`/`approved`, `rejected`). |

### 👥 User Administration
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| **GET** | `/api/users` | 🔒 | Lists all users registered on the platform. |
| **GET** | `/api/user/:id` | 🔒 | Retrieves user details by ID. |
| **PATCH** | `/api/user/:id` | 🔒 | Updates user profile details (`name`, `image`). |
| **PATCH** | `/api/user/role/:id` | 🔒 | Admin-only route to update a user's role (e.g. `admin`, `artist`, `user`). |

### 💬 Reflections & Reviews
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/comments` | 🔒 | Submits a new comment/review for an artwork. |
| **GET** | `/api/comments` | 🌐 | Retrieves comments. Filterable by `artWorkId` query parameter. |
| **PATCH** | `/api/comments/:id` | 🔒 | Updates an existing comment text. |
| **DELETE** | `/api/comments/:id` | 🔒 | Deletes a comment by ID. |

> [!NOTE]
> 🔒 Protected endpoints require a valid authorization header: `Authorization: Bearer <token>`.
> 🌐 Public endpoints can be requested without authentication.

---

## 🛠️ Environment Variables Configuration

Create a `.env` file in the root of the server folder and specify the following keys:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=art_hub

# Database Collections Mapping
DB_USERS=user
DB_ALL_COLLECTION=artworks
DB_COMMENTS_COLLECTION=comments
DB_ORDERS_COLLECTION=orders
DB_SUBSCRIPTION_PLAN_COLLECTION=subscription_plans
DB_SUBSCRIPTION_COLLECTION=subscriptions

# Stripe Checkout Secret
STRIPE_SECRET_KEY=your_stripe_secret_key

# Next.js Client Application URL (For JWT/JWKS & Redirects)
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000
```

---

## 🚀 Installation & Running Locally

1. **Navigate to the server directory**:
   ```bash
   cd server
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Start the backend server**:
   ```bash
   node index.js
   ```
   
   The server will start up and output:
   ```bash
   MongoDB connected 🚀
   Server running on port 5000
   ```
