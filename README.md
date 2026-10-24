# Task Management System

A full-stack Task Management System built with the MERN stack. It supports role-based access, task assignment and approval, progress tracking, task dependencies, notifications, workload reporting, and task history.

## Tech Stack

**Frontend**

- React
- Vite
- React Router
- Axios
- Bootstrap

**Backend**

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- bcryptjs
- Cookie-based authentication
- node-cron for scheduled task processing

## Features

- Role-based access for Admin, Manager, and Employee.
- User authentication and protected routes.
- Project and team management.
- Task creation, assignment, editing, and reassignment.
- Assignment approval and rejection workflows.
- Task lifecycle: Draft, Open, Assigned, In Progress, Blocked, Pending Review, Completed, and Closed.
- Task progress, estimated hours, actual hours, and time logging.
- Task dependencies and automatic unblocking when prerequisites are completed.
- Task attachments.
- Due dates, overdue filtering, and priority escalation.
- Notifications for task assignments and workflow events.
- Task history for tracking changes.
- Dashboard reports, workload summaries, and urgent-task prioritization.
- Search, filtering, and pagination.

## User Roles

### Admin

Manages users and has administrative access to the system.

### Manager

Manages tasks for accessible projects, reviews employee assignment requests, and approves completed tasks.

### Employee

Works on assigned tasks, updates progress, logs time, and submits completed tasks for review. Employee-created assignments can require manager approval.

## Project Structure

```text
TaskManage/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── jobs/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
└── README.md
```

_Your folders may differ slightly depending on your final implementation._

## Requirements

- Node.js and npm
- MongoDB running locally or a MongoDB connection URL
- Visual Studio Code or another code editor

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd TaskManage
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your GitHub repository URL.

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure backend environment variables

Create a `.env` file inside the `server` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/task_management_system
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Replace the example JWT secret with a strong, private value. Do not commit `.env` files or credentials to GitHub.

### 4. Start the backend

From the `server` directory, run the development command configured in `server/package.json`, typically:

```bash
npm run dev
```

The backend should run at:

`http://localhost:5000`

Health check:

`http://localhost:5000/api/health`

### 5. Install frontend dependencies

Open a second terminal:

```bash
cd client
npm install
```

### 6. Configure the frontend

Create `client/.env` if needed:

```env
VITE_API_URL=http://localhost:5000/api
```

### 7. Start the frontend

From the `client` directory, run:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

`http://localhost:5173`

_Check the `scripts` sections in both `package.json` files if a development command differs._

## API Overview

The backend API uses the `/api` base path.

| Area           | Base endpoint        | Purpose                                                  |
| -------------- | -------------------- | -------------------------------------------------------- |
| Authentication | `/api/auth`          | Login, registration, session, and logout operations      |
| Projects       | `/api/projects`      | Project and team operations                              |
| Tasks          | `/api/tasks`         | Create, list, update, and review tasks                   |
| Users          | `/api/users`         | Retrieve users; user creation and updates are Admin-only |
| Notifications  | `/api/notifications` | Retrieve notifications                                   |
| Reports        | `/api/reports`       | Dashboard, workload, and urgent-task reports             |
| Task history   | `/api/task-history`  | Review task change history                               |

### Task endpoints

| Method | Endpoint                           | Purpose                                                   |
| ------ | ---------------------------------- | --------------------------------------------------------- |
| GET    | `/api/tasks`                       | List tasks; supports implemented filtering and pagination |
| POST   | `/api/tasks`                       | Create a task                                             |
| PATCH  | `/api/tasks/:id`                   | Update an eligible task                                   |
| PATCH  | `/api/tasks/:id/review`            | Review a completed task                                   |
| PATCH  | `/api/tasks/:id/assignment-review` | Approve or reject an assignment                           |
| POST   | `/api/tasks/:id/time-entries`      | Log time                                                  |
| POST   | `/api/tasks/:id/attachments`       | Upload task attachments                                   |
| GET    | `/api/task-history/:id`            | Retrieve history for a task                               |

Authenticated endpoints require a valid session or authentication token, according to the configured authentication middleware. Role and project permissions are enforced by the backend.

## Testing

Test the application with the available test accounts for each role.

Recommended checks:

- Login and protected-route access.
- Role-based permissions.
- Task creation and assignment approval.
- Task progress updates and time logging.
- Completion review and closure.
- Task dependencies and automatic unblocking.
- Search, filtering, and pagination.
- Attachments and notifications.
- Task history and reports.
- Overdue-task handling and workload calculations.

Use Postman to test the API, including success cases, validation errors, and unauthorized requests.

## Environment and Security

- Keep `.env`, secrets, passwords, and private credentials out of version control.
- Use a strong JWT secret outside development.
- Validate request data on the backend.
- Enforce authorization on the server, not only in the frontend.
- Configure appropriate CORS settings for deployment.
- Review uploaded-file validation and storage before production deployment.

## Future Improvements

- Automated unit and integration tests.
- Deployment with production environment variables.
- More detailed reporting and export functionality.
- Improved accessibility and responsive UI testing.

## Author

Kavita raghvani

GitHub: https://github.com/kaviraghvani29
