-- FrontlineCPR911 database schema

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin') NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_type VARCHAR(100) NOT NULL,
  start_datetime DATETIME NULL,
  location VARCHAR(255) NULL,
  price DECIMAL(10,2) NULL,
  max_capacity INT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(50) NULL,
  dob DATE NULL,
  address VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  INDEX (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NULL,
  client_id INT NOT NULL,
  status ENUM('pending','paid','waitlist') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(50) NULL,
  course_type VARCHAR(100) NOT NULL,
  participants INT NOT NULL,
  location_pref VARCHAR(100) NOT NULL,
  address VARCHAR(255) NULL,
  preferred_dates VARCHAR(255) NULL,
  notes TEXT NULL,
  status ENUM('new','contacted','scheduled','closed') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
