const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Manage asset explorer (MAE) sever is  ready ");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.34gmw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("MAE").collection("users");
    const hrCollection = client.db("MAE").collection("hr");
    const employeeCollection = client.db("MAE").collection("employee");
    // exx
    const exxCollection = client.db("MAE").collection('exx');

    // user api
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/users-role", async (req, res) => {
      const query = req.query.email;

      const result = await hrCollection.find({ email: query }).toArray();
      res.send(result);
    });

    app.post("/register-hr", async (req, res) => {
      const { name, email, password, dob, companyName, logo, memberPackage } =
        req.body;

      const hr = {
        name,
        email,
        password,
        dob,
        companyName,
        logo,
        memberPackage,
        role: "hr",
      };
      const userHr = {
        name,
        email,
        companyName,
        memberPackage,
        role: "hr",
      };

      const queryUser = { email: email };
      const user = await userCollection.findOne(queryUser);
      if (user) {
        return res.send({ message: "user already exists", insertId: null });
      }
      const queryHr = { email: email };
      const existHr = await hrCollection.findOne(queryHr);
      if (existHr) {
        return res.send({ message: "hr already exists", insertId: null });
      }

      const result = await userCollection.insertOne(userHr);
      const hrResult = await hrCollection.insertOne(hr);
      res.send(hrResult);
    });

    //update hr data  after payment
    app.patch("/register-hr", async (req, res) => {
      const { paymentStatus, transactionId, hrId } = req.body;
      const filter = { _id: new ObjectId(hrId) };
      const updatedDoc = {
        $set: {
          paymentStatus: paymentStatus || "",
          transactionId: transactionId,
        },
      };

      const result = await userCollection.updateOne(filter, updatedDoc);
      const hrResult = await hrCollection.updateOne(filter, updatedDoc);
      res.send(hrResult);
    });

    //  employee api
   
    // get all employee data
    app.get('/employee', async(req,res) => {
      const l =await employeeCollection.estimatedDocumentCount();
      
      if(l >= 8){
        return res.status(404).send({message: 'Sorry hr your employee added limit is close(Please more package)',  insertedId: null})
      }
      res.send({l});
    })

    // create a employee
    app.post("/add-employee", async (req, res) => {
      const {
        name,
        email,
        password,
        dob,
        companyName,
        emCategory,
        emImage,
        emDetails,
        hrId,
        companyLogo,
        joinDate,
        memberPackage
      } = req.body;
     const packageLength = parseInt(memberPackage);
      const emUser = {
        name,
        email,
        dob,
        role: "employee",
        hrId,
        joinDate,
        emCategory,
        companyName,
      };
      const em = {
        name,
        email,
        password,
        dob,
        companyName,
        emCategory,
        emImage,
        emDetails,
        hrId,
        companyLogo,
        joinDate,
        role: "employee",
      };

      const queryUser = { email: email };
      const user = await userCollection.findOne(queryUser);
      if (user) {
        return res.send({ message: "user already exists", insertId: null });
      }
      const queryEm = { email: email };
      const existEm = await hrCollection.findOne(queryEm);
      if (existEm) {
        return res.send({ message: "employee already exists", insertId: null });
      }

      const packageLimit = await employeeCollection.estimatedDocumentCount();
      if(packageLimit >= packageLength){
        return res.status(404).send({message: 'Sorry hr your employee added limit is close(Please more package)',  insertedId: null})
      }

      const result = await userCollection.insertOne(emUser);
      const emResult = await employeeCollection.insertOne(em);
      res.send(emResult);
    });

    // hr payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { memberPackage } = req.body;
      const amount = parseInt(memberPackage * 100);

      // create a paymentIntent with the select package amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`This Manage asset explorer (MAE) server running PORT:${port}`);
});
