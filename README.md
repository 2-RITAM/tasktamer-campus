# TaskTamer Campus 🎯

A simple, browser-based task management application designed to help students organize academic work, track assignments, and manage daily tasks.

## ✨ Features

- **Task Management:** Add, edit, and delete tasks.
- **Task Status:** Mark tasks as complete or reopen them when needed.
- **Priority Levels:** Assign priorities to tasks.
- **Due Dates:** Set deadlines to keep track of upcoming work.
- **Task Filters:** View all tasks, open tasks, or completed tasks.
- **Dashboard:** View task statistics, including total, open, and completed tasks.
- **Browser Storage:** Retain tasks across page refreshes using browser storage.
- **Responsive Interface:** A clean interface built with HTML, CSS, and JavaScript.

## 🛠️ Tech Stack

- **HTML5** for structure
- **CSS3** for styling and layout
- **JavaScript** for application logic and interactions
- **Browser Storage** for local task persistence
- **Python HTTP Server** for local development and testing
- **Git and GitHub** for version control

## 📁 Project Structure

```text
tasktamer-campus/
├── index.html
├── css/
│   ├── base.css
│   ├── components.css
│   └── tokens.css
├── js/
│   ├── app.js
│   ├── shared/
│   │   └── contracts.js
│   └── ui/
│       ├── dashboard.js
│       ├── dom.js
│       ├── storage-adapter.js
│       └── tasks.js
├── docs/
│   └── DECISIONS.md
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- A modern web browser
- Python 3 installed (recommended for local development)

### Run Locally

1. Clone the repository:

   ```powershell
   git clone https://github.com/2-RITAM/tasktamer-campus.git
   ```

2. Navigate to the project directory:

   ```powershell
   cd tasktamer-campus
   ```

3. Start a local HTTP server:

   ```powershell
   py -m http.server 8000
   ```

4. Open the following address in your browser:

   ```text
   http://localhost:8000/
   ```

Keep the terminal open while using the application. Stop the server with `Ctrl + C`.

## 🌐 Deployment

TaskTamer Campus can be hosted using **GitHub Pages**.

1. Open the repository on GitHub.
2. Navigate to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch and the `/(root)` folder.
5. Click **Save** and wait for the deployment to complete.

Once deployment succeeds, the expected website URL is:

**https://2-ritam.github.io/tasktamer-campus/**

The website will be available after GitHub Pages finishes publishing the repository.

## 💾 Data Storage

Tasks are stored in the browser rather than in a centralized database.

- Tasks can persist across page refreshes in the same browser.
- Browser storage is generally specific to the browser and device.
- Tasks do not automatically synchronize across different devices or users.
- Clearing relevant browser storage may remove saved tasks.

## 🔒 Privacy

Task data is stored locally in the browser. Avoid entering sensitive personal information. The hosted application files are publicly accessible when the repository and GitHub Pages site are public.

## 🗺️ Future Improvements

Potential enhancements include:

- Cloud-based data storage and synchronization
- User authentication and individual accounts
- Search and sorting for tasks
- Improved deadline reminders
- More detailed productivity statistics
- Automated tests and expanded test coverage

These are possible future improvements, not features currently claimed to be implemented.

## 👩‍💻 Author

**Ritam Jha**

GitHub: [@2-RITAM](https://github.com/2-RITAM)

## 📄 License

No license has been specified yet. Unless a license is added to the repository, reuse and redistribution are not automatically granted.
