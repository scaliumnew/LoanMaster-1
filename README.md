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

### Database Export and Import

This application includes tools to help you export your development database and import it in your production environment.

#### Exporting Your Database
Before deployment, you may want to export your database to preserve your data:

```bash
# Export database schema and data
npm run db:export
```

This will create files in the `database-export` directory:
- `schema.sql`: Contains your table structure
- `data-[timestamp].sql`: Contains your current data

#### Import During Deployment
When deploying to a new environment:

```bash
# Initialize database with schema and optionally import data
npm run db:init
```

The initialization process will:
1. Check database connectivity
2. Apply schema from `schema.sql` if available
3. Offer to import the latest data export
4. Fall back to Drizzle ORM push if needed

### Production Deployment Steps

1. **Prepare Your Environment**
   ```bash
   # Clone the repository on your production server
   git clone https://github.com/Scalium-Tech/Loan-Manager.git
   cd Loan-Manager
   
   # Copy your database export files to the database-export directory (if needed)
   mkdir -p database-export
   cp /path/to/your/schema.sql database-export/
   cp /path/to/your/data.sql database-export/data-latest.sql
   ```

2. **Configure Environment**
   ```bash
   # Copy the example environment file and edit it
   cp .env.example .env
   
   # Update DATABASE_URL and other variables for production
   nano .env
   ```

3. **Install, Build and Start**
   ```bash
   # Install dependencies and initialize database
   npm install
   
   # Build the client
   npm run build
   
   # Start the production server
   npm start
   ```

### Platform-Specific Deployment

You can also deploy this application on various platforms:

- **Heroku/Railway/Render**:
  - Set environment variables in the platform's dashboard
  - The included Procfile will handle startup
  - For database: Use the platform's PostgreSQL add-on and set DATABASE_URL

- **Docker Deployment**:
  - Build using the included Dockerfile
  - Pass environment variables using Docker environment options
  - For database: Use a managed PostgreSQL service or deploy PostgreSQL alongside in Docker

### Important Notes

- Always back up your database before deployment
- The application handles database initialization automatically on startup
- In production, set NODE_ENV=production in your environment variables
- Make sure your database user has sufficient privileges for table creation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.