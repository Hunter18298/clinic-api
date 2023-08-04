//secret enviroment variable creator
//in terminal create hidden file touch .env
//the format must be capital variables lik DB_HOST=any
const { Pool } = require('pg');
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false
}));

// Other configurations and middlewares (body-parser, session, etc.)...

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

// Database pool
const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Connect to the database
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
// Configure passport LocalStrategy
passport.use(new LocalStrategy(async function(username, password, cb) {
  const loginQuery = "SELECT * FROM user_accounts WHERE username = $1;";
  try {
    const loginResult = await pool.query(loginQuery, [username]);
    if (loginResult.rows.length === 0) {
      // Username not found
      return cb(null, false, { message: 'Incorrect username or password.' });
    }

    const storedHash = loginResult.rows[0].password_hash;
    bcrypt.compare(password, storedHash, function(err, result) {
      if (err) {
        console.error(err);
        return cb(err);
      }

      if (result === true) {
        // Passwords match, return the user object
        return cb(null, loginResult.rows[0]);
      } else {
        // Passwords do not match
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
    });
  } catch (err) {
    console.error(err);
    return cb(err);
  }
}));
passport.serializeUser(function(user, cb) {
  cb(null, user.user_id);
});

passport.deserializeUser(function(id, cb) {
  pool.query('SELECT * FROM user_accounts WHERE user_id = $1', [id], function(err, result) {
    if (err) { return cb(err); }
    const user = result.rows[0];
    cb(null, user);
  });
});
// Other routes and app configurations...

// Start the server
// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Server started on port ${port}`);
// });

//body


//---------------Patients----------------
app.route('/patients').get( async function(req, res){
   if (req.isAuthenticated()) {
   try {
    const result = await pool.query('SELECT * FROM patients');
    res.json(result.rows);
  } catch (err) {
return res.status(500).json({
  status: "error"
});
  }
  } else {
    res.status(401).json({ error: 'User not authenticated' });
  }
 


}).post( async function(req, res) {
  const { patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit ,created_date, updated_date } = req.body;
   if (req.isAuthenticated()) {
   try {
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
  } catch (err) {
return res.status(500).json({
  status: "error"
});
  }
  } else {
    res.status(401).json({ error: 'User not authenticated' });
  }

});

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'An error occurred while authenticating' });
    }

    if (!user) {
      // Authentication failed, redirect to login-failure route
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // If authentication is successful, log in the user
    req.logIn(user, function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'An error occurred while logging in' });
      }

      // If you want to redirect the user to a dashboard page after successful login
      // You can do so here:
      // return res.redirect('/dashboard');

      // Or, you can send a success response with user information
      return res.status(200).json({ message: 'Login successful', user: user });
    });
  })(req, res, next);
});

// Handle login failure
app.get('/login-failure', function(req, res) {
  res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/register', async function(req, res) {
  const { username, password, role } = req.body;

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const registerQuery = 'INSERT INTO user_accounts (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(registerQuery, [username, hashedPassword, role]);
    const newUser = result.rows[0];

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while registering the user' });
  }
});

app.get('/logout', function(req, res) {
  // Call the req.logout() function and provide a callback function
  req.logout(function(err) {
    if (err) {
      // Handle any errors that occur during logout
      console.error(err);
      return res.status(500).json({ error: 'An error occurred during logout' });
    }

    // If logout is successful, send a response with status 200 and a JSON message
    return res.status(200).json({ message: 'Logout successful' });
  });
});

app.get('/user', function(req, res) {
  // If the user is authenticated, req.user will contain the user object.
  // You can access the user's information here and send it as a response.

  // For example:
  if (req.isAuthenticated()) {
    res.status(200).json({ user: req.user });
  } else {
    res.status(401).json({ error: 'User not authenticated' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});


// app.post('/login', async function(req, res) {
//   const { username, password } = req.body;
//   const loginQuery = "select * from user_accounts where username=$1;";
//   const getPassword = "select password_hash from user_accounts where username=$1;";

  // try {
  //   const loginResult = await pool.query(loginQuery, [username]);
  //   if (loginResult.rows.length === 0) {
  //     // Username not found
  //     return res.status(401).json({ error: "Invalid username or password" });
  //   }

  //   const storedHash = loginResult.rows[0].password_hash;
  //   bcrypt.compare(password, storedHash, function(err, result) {
  //     if (err) {
  //       console.error(err);
  //       return res.status(500).json({ error: "An error occurred while comparing passwords" });
  //     }

  //     if (result === true) {
  //       // Passwords match
  //       return res.status(200).json(loginResult.rows[0]);
  //     } else {
  //       // Passwords do not match
  //       return res.status(401).json({ error: "Invalid username or password" });
  //     }
  //   });
  // } catch (err) {
  //   console.error(err);
  //   return res.status(500).json({ error: "An error occurred while processing the request" });
  // }
// });



//  app.post('/register',async function(req,res){
//   const {username,password,role}=req.body;
//   const registerQuery="insert into user_accounts(username , password_hash, role) values($1, $2 , $3) RETURNING * ;";
//   try{  
//     bcrypt.genSalt(saltRounds, function(err, salt) {
//     bcrypt.hash(password, salt,async function(err, hash) {
//         // Store hash in your password DB.
//        const registerResult=await pool.query(registerQuery, [username, hash, role]);
//          res.status(201).json(registerResult.rows[0]);
//     });
// });
 


//   }catch(err){
//     console.error(err);
//      res.status(500).json({ error: 'server error .' });
//   }

//  });




// app.listen(3000, function() {
//   console.log("Server started on port 3000");
// });

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