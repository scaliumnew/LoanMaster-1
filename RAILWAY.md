# Railway Deployment Guide

This document provides instructions for deploying the Loan Management System on [Railway.com](https://railway.com).

## Prerequisites

1. A Railway account
2. A PostgreSQL database provisioned on Railway (or elsewhere)

## Environment Variables

The following environment variables need to be set in Railway:

```
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```

## Deployment Steps

### Option 1: Deploy from GitHub

1. Log in to Railway.com
2. Create a new project
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select this repository
5. Railway will automatically detect the project as a Node.js app
6. Add a PostgreSQL database to your project from the Railway dashboard
7. No additional configuration is needed as Railway will automatically set up the DATABASE_URL

### Option 2: Deploy Using Railway CLI

1. Install the Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Log in to your Railway account:
   ```bash
   railway login
   ```

3. Initialize a new project:
   ```bash
   railway init
   ```

4. Add a PostgreSQL database:
   ```bash
   railway add
   ```

5. Deploy the application:
   ```bash
   railway up
   ```

## Health Check and Monitoring

The application includes a health check endpoint at `/api/health` that Railway uses to determine if the deployment is successful. The health check verifies:

- Server availability
- Database connectivity
- Basic database operations

## Troubleshooting Railway Deployments

If you encounter a 502 error or database connection issues in Railway:

1. Check the Railway logs for specific error messages
2. Run the troubleshooting script: `node scripts/railway-db-troubleshoot.js`
3. Make sure the PostgreSQL database is properly provisioned and accessible

### Fixing Database Connection Issues

If you see `ECONNREFUSED` errors with the hostname `loanmaster-1.railway.internal` or similar:

#### Option 1: Use Railway's Internal Networking (Recommended)

1. Ensure your PostgreSQL service is named `postgres` in Railway
2. Set these environment variables in Railway:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/railway
   PGHOST=postgres
   PGSSLMODE=disable
   ```

#### Option 2: Manual Connection Config

If Option 1 doesn't work, try explicitly setting all database variables:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/railway
   PGUSER=postgres
   PGPASSWORD=YOUR_PASSWORD
   PGHOST=postgres
   PGPORT=5432
   PGDATABASE=railway
   PGSSLMODE=disable
   ```

The application includes robust error handling and connection retry logic specifically designed for Railway deployments. It will:

- Try multiple connection methods (template variables, direct connection, internal networking)
- Retry database connections with exponential backoff
- Continue running in a degraded state if database connections fail in production
- Log detailed error information for debugging

## Database Management

If you need to manually initialize the database:

1. Connect to your Railway database using the provided credentials
2. Run the SQL scripts in the `database-export` directory
3. Alternatively, the application will auto-initialize the database on first run

## Checking Deployment Status

After deployment, you can check the status of your application using:

```bash
railway status
```

And view the logs with:

```bash
railway logs
```

The application is designed to be resilient to temporary database connection issues, which are common during Railway deployments.