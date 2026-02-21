🚘 Ride & Roam

Ride & Roam is a modular web application for ride sharing and trip coordination with features including user authentication, trip management, live map tracking, internal wallet payments, premium access, and data validation. This repository uses Firebase for authentication/storage and Easypay for secure payment handling.

🧩 Project Architecture

The app is built following a modular structure, where each module handles one core aspect of the platform:

Module	Responsibility
Authentication	Secure user signup + login with Firebase
Dashboard	User control panel
Trip Management	Create, search, join, and manage trips
Live Location	Real-time map route tracking
Wallet	Internal wallet and payments system
Premium	Special paid user features
Validation	Ensuring correct and secure data
🛠️ Technologies Used

Firebase — Authentication, Firestore, hosting backend.

Easypay — Payment gateway integration.

Vanilla JavaScript, HTML, CSS — Frontend pages.

Firestore Rules — Security data access control.

Firebase Hosting + Functions — App backend services.

📂 Folder Structure
Ride-and-Roam/
├── assets/                     
├── functions/                 # Firebase cloud functions
├── firebase-init.js           # Firebase initialization
├── firestore.rules            # Database rules
├── index.html                 # Main entry page
├── login.html                 # User login
├── dashboard.html            # Dashboard UI
├── create-trips.html         # Trip creation page
├── live-location.js          # Live map route handling
├── easypayio-gateway.js      # Payment gateway integration
├── wallet.html               # Wallet UI
├── premium.html              # Premium UI
└── ...other UI pages          # Includes join, settings, chat, etc. :contentReference[oaicite:7]{index=7}
🚀 Features
✔ Authentication

User signup/login via Firebase

Secured access to protected pages

Profile update & validation

✔ Trip Management

Create new trips

Join existing trips

View joined and created trips

✔ Live Tracking

Real-time location updates

Map rendering (client integration)

✔ Wallet & Payments

Wallet balance view

Payment through Easypay

Transaction handling UI

✔ Premium

Special access features behind paywall

Available UI components for subscriptions

✔ Validation

On-page data checks

Firestore rules for secure storage

📦 Installation & Setup
1. Clone the repository
git clone https://github.com/Grvyshakh/Ride-and-Roam.git
cd Ride-and-Roam
2. Setup Firebase

Create a Firebase project

Enable Authentication (Email/Password)

Enable Firestore database

Add Firebase web app credentials in firebase-init.js

Example:

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER",
  appId: "YOUR_APP",
};
3. Configure Easypay

Register / setup merchant details

Add API keys in easypayio-gateway.js

Set correct callbacks to wallet handling pages

🔐 Security Best Practices

Use Firestore security rules (in firestore.rules) to restrict access

Protect Easypay keys and avoid committing sensitive values

Handle session/auth tokens securely in JS

🧠 How to Use

Open login.html and authenticate

Navigate to dashboard.html

Create or join a trip

Use live-location.html to track routes

Add funds in wallet.html

Use payment flow via Easypay

📖 Contributing

We welcome improvements and feedback:

Fork the repository

Create a feature branch

Commit and push

Open a Pull Request

📜 License

This project is licensed under the GNU GPL-3.0 License.
