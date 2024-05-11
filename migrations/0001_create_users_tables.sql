-- Migration number: 0001 	 2024-05-07T07:57:18.000Z

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_emails;

-- Create the users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT
);

-- Create the user_emails table
CREATE TABLE user_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);