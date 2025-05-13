# Loan Management System for NBFCs

A comprehensive loan management system for small Non-Banking Financial Companies (NBFCs) designed to streamline loan lifecycle management.

## Key Features

- **Client Management**: Add, edit, and track clients and their loans
- **Loan Creation**: Support for multiple loan types and repayment frequencies
  - Interest calculation: Flat or reducing balance methods
  - Repayment frequency: Daily, weekly, or monthly
  - Configurable late fees and preclosure fees
- **Payment Tracking**: Record full or partial payments against installments
  - Automatic calculation of late fees based on due dates
  - Support for preclosure fee calculation
- **Installment Scheduling**: Auto-generated schedule with principal and interest
- **Alerts and Notifications**: Upcoming and overdue payments, loans nearing end
- **Reports and Analytics**: Financial reports on disbursements, collections, and more

## Technical Details

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: React Query for server state
- **Form Handling**: React Hook Form with Zod validation

## Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/Scalium-Tech/Loan-Manager.git
cd Loan-Manager
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your database credentials and other configurations
nano .env  # or use any text editor
```

4. Set up the database
```bash
# Option 1: Start with a fresh database (schema only)
npm run db:push

# Option 2: Import existing data (if you have a database dump)
psql your_database_name < database_dump.sql
```

5. Start the development server
```bash
npm run dev
```

## Deployment Instructions

### Prerequisites
- Node.js (v16 or newer)
- PostgreSQL database
- Environment variables properly configured

### Production Deployment
1. Clone the repository on your production server
2. Install dependencies: `npm install --production`
3. Build the client: `npm run build`
4. Configure environment variables with production settings
5. Start the server: `npm start`

You can also deploy this application on various platforms:

- **Heroku**: Use the Procfile included in the repository
- **Railway/Render/Fly.io**: Use the deployment configuration in their respective formats
- **Docker**: A Dockerfile is included for containerized deployment

Remember to set up your PostgreSQL database separately and configure the DATABASE_URL environment variable.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.