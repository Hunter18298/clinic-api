//secret enviroment variable creator
//in terminal create hidden file touch .env
//the format must be capital variables lik DB_HOST=any
const {
  Pool
} = require('pg');
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
//patients" table. We use the "ON DELETE CASCADE" option to automatically delete related expenses when a patient is deleted.
// Other configurations and middlewares (body-parser, session, etc.)...

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());
const connectionString = 'postgres://hunter:FIStpVhUm8tdfDaDkaNCeOzHi9tpP28T@dpg-cj7645djeehc739rtalg-a/clinic_6qfu';
const pool = new Pool({ connectionString });
// Database pool
// const pool = new Pool({
//   user: process.env.DB_USERNAME,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// // Connect to the database
// async function connectToDatabase() {
//   try {
//     const client = await pool.connect();

//     console.log('Connected to PostgreSQL database!');
//     client.release();
//   } catch (err) {
//     console.error('Error acquiring client', err.stack);
//   }
// }


// connectToDatabase();

async function createTables() {
  try {
    const client = await pool.connect();

 
 
   
    // Create employees table
    await client.query(`
      CREATE TABLE employees (
        employee_id SERIAL PRIMARY KEY,
        employee_name VARCHAR(100) NOT NULL,
        employee_type_id INTEGER REFERENCES employee_types(type_id),
        employee_salary NUMERIC(10, 2) NOT NULL,
        hired_date DATE NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

  

  
    // Create expense_invoice table
    await client.query(`
      CREATE TABLE expense_invoice (
        invoice_id SERIAL PRIMARY KEY,
        invoice_date DATE NOT NULL,
        expense_id INTEGER REFERENCES expenses(expense_id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create patient_invoice table
    await client.query(`
      CREATE TABLE patient_invoice (
        invoice_id SERIAL PRIMARY KEY,
        invoice_date DATE NOT NULL,
        patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tables created successfully');
    client.release();
  } catch (err) {
    console.error('Error creating tables:', err);
  }
}

createTables();

app.use(express.json());
// Configure passport LocalStrategy
passport.use(new LocalStrategy(async function (username, password, cb) {
  const loginQuery = "SELECT * FROM user_accounts WHERE username = $1;";
  try {
    const loginResult = await pool.query(loginQuery, [username]);
    if (loginResult.rows.length === 0) {
      // Username not found
      return cb(null, false, {
        message: 'Incorrect username or password.'
      });
    }

    const storedHash = loginResult.rows[0].password_hash;
    bcrypt.compare(password, storedHash, function (err, result) {
      if (err) {
        console.error(err);
        return cb(err);
      }

      if (result === true) {
        // Passwords match, return the user object
        return cb(null, loginResult.rows[0]);
      } else {
        // Passwords do not match
        return cb(null, false, {
          message: 'Incorrect username or password.'
        });
      }
    });
  } catch (err) {
    console.error(err);
    return cb(err);
  }
}));
passport.serializeUser(function (user, cb) {
  cb(null, user.user_id);
});

passport.deserializeUser(function (id, cb) {
  pool.query('SELECT * FROM user_accounts WHERE user_id = $1', [id], function (err, result) {
    if (err) {
      return cb(err);
    }
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
app.route('/patients').get(async function (req, res) {
  if (req.isAuthenticated()) {
    try {
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      let query = 'SELECT * FROM patients ORDER BY created_date DESC';
      const values = [];
      
      if (startDate && endDate) {
        query = 'SELECT * FROM patients WHERE patient_next_visit BETWEEN $1 AND $2 ORDER BY patient_next_visit DESC';
        values.push(new Date(startDate), new Date(endDate));
      }
      
      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: "error"
      });
    }
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }
}).post(async function (req, res) {
  const {
    patient_code,
    patient_name,
    patient_phone_no,
    patient_age,
    patient_money,
    patient_next_visit,
    types,
    body_part,
    sits
  } = req.body;
  if (req.isAuthenticated()) {
    try {
      // Convert patient_next_visit to a Date object
      const nextVisitDate = new Date(patient_next_visit);

      // Check if required fields are provided
      if (!patient_code || !patient_name || !patient_phone_no || !patient_age || !patient_money || !patient_next_visit) {
        return res.status(400).json({
          error: 'All fields are required.'
        });
      }

      await pool.connect();
      try {
        // getting parameters
        const values = [patient_code, patient_name, patient_phone_no, patient_age, patient_money, nextVisitDate, new Date(), new Date(), types, body_part,
    sits];

        // query
        const result = await pool.query(`
          INSERT INTO patients (patient_code, patient_name, patient_phone_no, patient_age, patient_money, patient_next_visit, created_date, updated_date, types, body_part,
    sits)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)
          RETURNING *;
        `, values);

        console.log(result.rows[0]);
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({
          error: 'Error creating patient. Please try again later.'
        });
      }
    } catch (err) {
      return res.status(500).json({
        status: "error"
      });
    }
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }
});
app.route('/patients/:id').delete(async function (req, res) {
  if (req.isAuthenticated()) {
    const patientId = req.params.id;

    try {
      await pool.connect();
      try {
        // Check if the patient exists
        const checkResult = await pool.query('SELECT * FROM patients WHERE patient_id = $1', [patientId]);
        if (checkResult.rows.length === 0) {
          return res.status(404).json({
            error: 'Patient not found.'
          });
        }

        // Delete the patient
        await pool.query('DELETE FROM patients WHERE patient_id = $1', [patientId]);

        res.status(204).send(); // Successfully deleted
      } catch (err) {
        console.error(err);
        res.status(500).json({
          error: 'Error deleting patient. Please try again later.'
        });
      }
    } catch (err) {
      return res.status(500).json({
        status: "error"
      });
    }
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }
});



app.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: 'An error occurred while authenticating'
      });
    }

    if (!user) {
      // Authentication failed, redirect to login-failure route
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }

    // If authentication is successful, log in the user
    req.logIn(user, function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          error: 'An error occurred while logging in'
        });
      }

      // If you want to redirect the user to a dashboard page after successful login
      // You can do so here:
      // return res.redirect('/dashboard');

      // Or, you can send a success response with user information
      return res.status(200).json({
        message: 'Login successful',
        user: user
      });
    });
  })(req, res, next);
});

// Handle login failure
app.get('/login-failure', function (req, res) {
  res.status(401).json({
    error: 'Invalid username or password'
  });
});

app.post('/register', async function (req, res) {
  const {
    username,
    password,
    role
  } = req.body;

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const registerQuery = 'INSERT INTO user_accounts (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(registerQuery, [username, hashedPassword, role]);
    const newUser = result.rows[0];

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'An error occurred while registering the user'
    });
  }
});

app.get('/logout', function (req, res) {
  // Call the req.logout() function and provide a callback function
  req.logout(function (err) {
    if (err) {
      // Handle any errors that occur during logout
      console.error(err);
      return res.status(500).json({
        error: 'An error occurred during logout'
      });
    }

    // If logout is successful, send a response with status 200 and a JSON message
    return res.status(200).json({
      message: 'Logout successful'
    });
  });
});

app.get('/user', function (req, res) {
  // If the user is authenticated, req.user will contain the user object.
  // You can access the user's information here and send it as a response.

  // For example:
  if (req.isAuthenticated()) {
    res.status(200).json({
      user: req.user
    });
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }
});


//---------------Expenses----------------
app.route('/expenses').get(async function (req, res) {
  if (req.isAuthenticated()) {
    try {
      const result = await pool.query(`SELECT expenses.expense_id, expenses.expense_amount,expenses.category_id,expenses.expense_date,expenses.created_date,categories.category_name,expenses.title,expenses.expense_date,expenses.updated_date
FROM expenses
INNER JOIN categories ON expenses.category_id = categories.category_id;`);
      res.json(result.rows);
    } catch (err) {
      return res.status(500).json({
        status: 'error',
        error: 'Error fetching expenses',
      });
    }
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }
}).post(async function (req, res) {
  if (req.isAuthenticated()) {
    const {
      expense_amount,
      expense_date,
      category_id,
      title
    } = req.body;
    try {
      // Check if required fields are provided
      if (!expense_amount || !expense_date) {
        return res.status(400).json({
          error: 'All fields are required.'
        });
      }

      // Insert expense into the database
      const values = [expense_amount, expense_date, new Date(), new Date(), category_id, title];
      const result = await pool.query(`INSERT INTO expenses ( expense_amount, expense_date, created_date, updated_date, category_id, title) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`, values);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Error creating expense. Please try again later.'
      });
    }
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }
});
app.route('/expenses/:id')
  .delete(async function (req, res) {
    if (req.isAuthenticated()) {
      const expenseId = req.params.id;

      if (!expenseId) {
        return res.status(400).json({
          error: 'Expense ID is required for deletion.'
        });
      }

      try {
        const result = await pool.query('DELETE FROM expenses WHERE expense_id = $1 RETURNING *;', [expenseId]);

        if (result.rowCount === 0) {
          return res.status(404).json({
            error: 'Expense not found or already deleted.'
          });
        }

        res.status(200).json({
          message: `Expense with ID: ${expenseId} deleted successfully.`,
          deletedExpense: result.rows[0]
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({
          error: 'Error deleting expense. Please try again later.'
        });
      }
    } else {
      res.status(401).json({
        error: 'User not authenticated'
      });
    }
  });

//---------------Employees----------------
app.route('/employees').get(async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT employees.employee_id, employees.employee_name, employees.employee_salary, employees.hired_date, employee_types.type_name,employees.employee_type_id
      FROM employees
      LEFT JOIN employee_types ON employees.employee_type_id = employee_types.type_id;
    `);
    res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      error: 'Error fetching employees',
    });
  }
}).post(async function (req, res) {
  const {
    employee_name,
    employee_type_id,
    employee_salary,
    hired_date
  } = req.body;
  try {
    // Check if required fields are provided
    if (!employee_name || !employee_salary || !hired_date) {
      return res.status(400).json({
        error: 'Employee name, salary, and hired date are required.'
      });
    }

    // Insert employee into the database
    const values = [employee_name, employee_type_id, employee_salary, hired_date, new Date(), new Date()];
    const result = await pool.query(`
      INSERT INTO employees (employee_name, employee_type_id, employee_salary, hired_date, created_date, updated_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error creating employee. Please try again later.'
    });
  }
});

app.put('/employees/:id', async function (req, res) {
  const employeeId = req.params.id;
  const {
    employee_name,
    employee_type_id,
    employee_salary,
    hired_date
  } = req.body;

  try {
    const updateQuery = `
      UPDATE employees
      SET employee_name = $1, employee_type_id = $2, employee_salary = $3, hired_date = $4, updated_date = $5
      WHERE employee_id = $6
      RETURNING *;
    `;

    const values = [employee_name, employee_type_id, employee_salary, hired_date, new Date(), employeeId];
    const result = await pool.query(updateQuery, values);

    res.json({
      message: 'Employee updated successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update employee. Please try again later.'
    });
  }
});

app.delete('/employees/:id', async function (req, res) {
  const employeeId = req.params.id;

  try {
    await pool.query('DELETE FROM employees WHERE employee_id = $1', [employeeId]);

    res.json({
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete employee. Please try again later.'
    });
  }
});

//---------------Employee Types----------------
app.route('/employee-types').get(async function (req, res) {
  try {
    const result = await pool.query('SELECT * FROM employee_types');
    res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      error: 'Error fetching employee types',
    });
  }
}).post(async function (req, res) {
  const {
    type_name
  } = req.body;
  try {
    // Check if required fields are provided
    if (!type_name) {
      return res.status(400).json({
        error: 'Type name is required.'
      });
    }

    // Insert employee type into the database
    const values = [type_name];
    const result = await pool.query(`
      INSERT INTO employee_types (type_name)
      VALUES ($1)
      RETURNING *;
    `, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error creating employee type. Please try again later.'
    });
  }
});
//---------------------Categories---------------------//
app.route('/categories').get(async function (req, res) {

  if (req.isAuthenticated) {
    try {
      const categoryResult = await pool.query('select * from categories');
      res.status(201).json(categoryResult.rows);

    } catch (e) {

      res.status(500).json({
        error: 'Error getting categories'
      })


    }
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }

}).post(async function (req, res) {
  if (req.isAuthenticated) {
    const {
      category_name
    } = req.body;

    try {
      const categoryResult = await pool.query('insert into categories(category_name) values($1)', [category_name]);
      res.status(200).json(categoryResult.rows[0]);

    } catch (e) {

      res.status(500).json({
        error: 'Error getting categories'
      })


    }
  } else {
    res.status(401).json({
      error: 'User not authenticated'
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});