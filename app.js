//secret enviroment variable creator
//in terminal create hidden file touch .env
//the format must be capital variables lik DB_HOST=any
require('dotenv').config();
const { Pool } = require('pg');
const { Client } = require('pg');
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
// const ejs = require("ejs");
const app = express();
// Import the user route and register it


// pools will use environment variables
// for connection information
// you can also use async/await
// clients will also use environment variables
// for connection information
// const res = await client.query('SELECT NOW()')
// await client.end()
const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST ,
  database:  process.env.DB_NAME,
  password:  process.env.DB_PASSWORD,
  port: process.env.PORT,
});



async function connectToDatabase() {
  try {
    const client = await pool.connect();
     
    console.log('Connected to PostgreSQL database!');
    client.release();
  } catch (err) {
    console.error('Error acquiring client', err.stack);
  }
}
connectToDatabase();
app.use(express.json());
//body


//---------------Patients----------------
app.route('/patients').get( async function(req, res){
 try {
    const result = await pool.query('SELECT * FROM patients');
    res.json(result.rows);
  } catch (err) {
return res.status(500).json({
  status: "error"
});
  }


}).post( async function(req, res) {
  const { patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit ,created_date, updated_date } = req.body;

  // Check if required fields are provided
  // if (!patient_code || !patient_name || !patient_phone_no || !patient_age || !patient_money || !patient_next_visit) {
  //   return res.status(400).json({ error: 'All fields are required.' });
  // }
await pool.connect();
  try {
    // getting parameters
    const values = [patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit,new Date(),new Date()];
    //query
    const result = await pool.query(`
  INSERT INTO patients (patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit, created_date, updated_date)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *;
`,values);

  //    "patient_code": "P001",
  // "patient_name": "John Doe",
  // "patient_phone_no": "9876543210",
  // "patient_age": "9876543210",
  // "patient_money": "9876543210",
  // "patient_next_visit": "2023-08-15"
  console.log(result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating patient. Please try again later.' });
  }
})






app.listen(3000, function() {
  console.log("Server started on port 3000");
});

// function generateToken(user) {
// // Generate a random string of 32 characters
// const secretKey = crypto.randomBytes(32).toString('hex');
//   const payload = {
//     user_id: user.user_id,
//     username: user.username,
//     role: user.role,
//   };

//   const options = {
//     expiresIn: '15h', // Token expires in 1 hour
//   };

//   return jwt.sign(payload, secretKey, options);
// }
// // Authentication endpoint to get a JWT token
// app.post('/auth', async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     // Query the database to find the user by the provided username
//     const result = await pool.query('SELECT * FROM user_accounts WHERE username = $1', [username]);
//     const user = result.rows[0];

//     // If user not found or password doesn't match, return error
//     if (!user || !(await bcrypt.compare(password, user.password_hash))) {
//       return res.status(401).json({ error: 'User Not Found' });
//     }

//     // Authentication successful, generate and return the JWT token
//     const token = generateToken(user);
//     res.json({ token, role: user.role });
//   } catch (error) {
//     console.error('Error during authentication:', error);
//     res.status(500).json({ error: 'Internal server error.' });
//   }

//   const token = generateToken(user);
//   res.json({ token, role: user.role });
// });

// // Protected API endpoints
// // The verifyToken middleware has been updated to verify the role of the user as well.
// function verifyTokenWithRole(requiredRole) {
//   return (req, res, next) => {
//     const token = req.header('Authorization');

//     if (!token) {
//       return res.status(401).json({ error: 'Unauthorized. Token missing.' });
//     }

//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//       if (err) {
//         return res.status(403).json({ error: 'Invalid token.' });
//       }

//       // Check if the decoded user has the required role
//       if (!decoded.role || decoded.role !== requiredRole) {
//         return res.status(403).json({ error: 'Insufficient permissions.' });
//       }

//       req.userId = decoded.id;
//       next();
//     });
//   };
// }

// app.get('/patients', verifyTokenWithRole('moderator'), async (req, res) => {
//   // Fetch and return all patients (you can implement the database query here)
//   try {
//     const result = await pool.query('SELECT * FROM patients');
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Error fetching patients' });
//   }
// });

// app.post('/patients', verifyTokenWithRole('admin'), async (req, res) => {
//   const { patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit } = req.body;

//   try {
//     const insertQuery = `
//       INSERT INTO patients (patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit)
//       VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING *;
//     `;

//     const values = [patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit];
//     const result = await pool.query(insertQuery, values);

//     // The newly created patient will be available in the 'result.rows[0]' object
//     const createdPatient = result.rows[0];

//     res.status(201).json(createdPatient);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create patient. Please try again later.' });
//   }
// });

// app.put('/patients/:id', verifyTokenWithRole('admin'), async (req, res) => {
//   const patientId = req.params.id;
//   const { patient_name, patient_phone_no, patient_age } = req.body;

//   try {
//     const updateQuery = `
//       UPDATE patients
//       SET patient_name = $1, patient_phone_no = $2, patient_age = $3
//       WHERE patient_id = $4
//       RETURNING *;
//     `;

//     const values = [patient_name, patient_phone_no, patient_age, patientId];
//     const result = await pool.query(updateQuery, values);

//     // The updated patient will be available in the 'result.rows[0]' object
//     const updatedPatient = result.rows[0];

//     res.json({ message: 'Patient updated successfully', patient: updatedPatient });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update patient. Please try again later.' });
//   }
// });


// app.delete('/patients/:id', verifyTokenWithRole('admin'), async (req, res) => {
//   const patientId = req.params.id;

//   try {
//     const deleteQuery = `
//       DELETE FROM patients
//       WHERE patient_id = $1;
//     `;

//     await pool.query(deleteQuery, [patientId]);

//     res.json({ message: 'Patient deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete patient. Please try again later.' });
//   }
// });


 

//  pool.connect((err, client, release) => {
//   if (err) {
//     return console.error('Error acquiring client', err.stack);
//   }
//   console.log('Connected to PostgreSQL database!');
//   release();
// });



// pool.query(`
//   CREATE TABLE IF NOT EXISTS patients (
//     patient_id SERIAL PRIMARY KEY,
//     patient_code VARCHAR(50) NOT NULL,
//     patient_name VARCHAR(100) NOT NULL,
//     patient_phone_no BIGINT,
//     patient_age INTEGER,
//     patient_money NUMERIC,
//     patient_next_visit DATE,
//     created_date DATE DEFAULT CURRENT_DATE,
//     updated_date DATE DEFAULT CURRENT_DATE
//   );
// `).then(() => {
//   console.log('Patients table created successfully!');
// }).catch((err) => {
//   console.error('Error creating patients table:', err);
// });

//user Table
// pool.query(
// `CREATE TABLE IF NOT EXISTS user_accounts (
//         user_id SERIAL PRIMARY KEY,
//         username VARCHAR(100) NOT NULL,
//         password_hash VARCHAR(255) NOT NULL,
//         role VARCHAR(20) NOT NULL
//       );
// `).then(() => {
//   console.log('Patients table created successfully!');
// }).catch((err) => {
//   console.error('Error creating patients table:', err);
// });