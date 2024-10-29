/*jshint esversion: 8 */
const express = require('express');
const app = express();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const connectToDatabase = require('../models/db');
const router = express.Router();
const dotenv = require('dotenv');
const pino = require('pino');

const logger = pino();
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
	try {
		// Task 1: Connect to `giftsdb` in MongoDB through `connectToDatabase` in `db.js`
		const db = await connectToDatabase();

		// Task 2: Access MongoDB collection
		const collection = db.collection('users');

		//Task 3: Check for existing email
		const existingEmail = await collection.findOne({ email: req.body.email });
		if (existingEmail) {
			return res.status(422).send('User already exists');
		}

		const salt = await bcryptjs.genSalt(10);
		const hash = await bcryptjs.hash(req.body.password, salt);
		const email = req.body.email;

		// {{insert code here}} //Task 4: Save user details in database
		const newUser = await collection.insertOne({
			email: req.body.email,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			password: hash,
			createdAt: new Date(),
		});
		// {{insert code here}} //Task 5: Create JWT authentication with user._id as payload
		const payload = {
			user: {
				id: newUser._id,
			},
		};

		const authtoken = jwt.sign(payload, JWT_SECRET);

		logger.info('User registered successfully');
		res.json({ authtoken, email });
	} catch (e) {
		return res.status(500).send('Internal server error');
	}
});

router.post('/login', async (req, res) => {
	try {
		// Task 1: Connect to `giftsdb` in MongoDB through `connectToDatabase` in `db.js`.
		const db = await connectToDatabase();
		// Task 2: Access MongoDB `users` collection
		const collection = await db.collection('users');
		// Task 3: Check for user credentials in database
		const existingUser = await collection.findOne({ email: req.body.email });
		// Task 4: Task 4: Check if the password matches the encrypyted password and send appropriate message on mismatch
		// Task 7: Send appropriate message if user not found
		if (!existingUser) {
			return res.status(404).send('User not found.');
		}

		const doMatch = await bcryptjs.compare(
			req.body.password,
			existingUser.password
		);

		if (!doMatch) {
			return res.status(422).send('Password is incorrect');
		}
		// Task 5: Fetch user details from database
		const userName = existingUser.firstName;
		const userEmail = existingUser.email;
		// Task 6: Create JWT authentication if passwords match with user._id as payload
		const payload = {
			user: {
				id: existingUser._id,
			},
		};
		const authtoken = jwt.sign(payload, JWT_SECRET);
		res.json({ authtoken, userName, userEmail });
	} catch (e) {
		return res.status(500).send('Internal server error');
	}
});

router.put('/update', async (req, res) => {
	try {
		// Task 2: Validate the input using `validationResult` and return approiate message if there is an error.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			logger.error('Validation errors in update request', errors.array());
			return res.status(422).json({
				errors: errors.array(),
			});
		}

		// Task 3: Check if `email` is present in the header and throw an appropriate error message if not present.
		const email = req.headers.email;
		if (!email) {
			logger.error('Email not found in the request headers');
			return res
				.status(400)
				.json({ error: 'Email not found in the request headers' });
		}

		// Task 4: Connect to MongoDB
		const db = await connectToDatabase();
		const collection = db.collection('users');

		// Task 5: find user credentials in database
		const existingUser = await collection.findOne({ email });
		if (!existingUser) {
			logger.error('User not found');
			return res.status(404).json({ error: 'User not found' });
		}

		existingUser.firstName = req.body.name;
		existingUser.updatedAt = new Date();
		// Task 6: update user credentials in database
		const updatedUser = await collection.findOneAndUpdate(
			{ email },
			{ $set: existingUser },
			{ returnDocument: 'after' }
		);
		// Task 7: create JWT authentication using secret key from .env file
		const payload = {
			user: {
				id: updatedUser._id.toString(),
			},
		};

		const authtoken = jwt.sign(payload, JWT_SECRET);
		res.json({ authtoken });
	} catch (e) {
		return res.status(500).send('Internal server error');
	}
});

module.exports = router;