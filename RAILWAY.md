# Railway Deployment Guide

This document provides instructions for deploying the Loan Management System on [Railway.com](https://railway.com).

## Prerequisites

1. A Railway account
2. A PostgreSQL database provisioned on Railway (or elsewhere)

## Environment Variables

The following environment variables should be set in Railway:

```
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
```

For the database connection, Railway provides multiple options:

### Option 1: Use Railway's Auto-linking (Recommended)

When you add a PostgreSQL service to your project, Railway automatically sets up the necessary environment variables. Our application is built to detect and use these automatically.

### Option 2: Use Railway's Proxy Connection (Reliable)

Railway provides a proxy connection URL that you can manually set:

```
DATABASE_URL=postgresql://postgres:PASSWORD@crossover.proxy.rlwy.net:PORT/railway
```

This is the most reliable method as it works consistently across deployments. You can find this connection string in your Railway PostgreSQL service details.

### Option 3: Use Template Variables

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

While convenient, template variables sometimes fail to resolve correctly. Our application includes fallback mechanisms if this happens.

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

If you see `ECONNREFUSED` errors or `Connection terminated due to connection timeout` errors in your Railway logs:

#### Step 1: Ensure Your PostgreSQL Service is Named "postgres" in Railway (CRITICAL!)

The most common issue is that the PostgreSQL service isn't named correctly in Railway:

1. Go to your Railway dashboard
2. Look at the services in your project
3. Find your PostgreSQL database service
4. Make sure it's named exactly `postgres` (not "postgresql", "db", etc.)
5. If it's named something else, rename it:
   - Click on the service
   - Go to Settings
   - Change the service name to `postgres`
   - Deploy again

#### Step 2: Configure Connection Variables

Our application is built to detect and fix most connection issues automatically, but you can also manually set these variables:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/railway
PGHOST=postgres
PGPORT=5432
PGUSER=postgres
PGPASSWORD=YOUR_PASSWORD
PGDATABASE=railway
PGSSLMODE=disable
```

#### Step 3: Check for Common Errors in Logs

If you see `PGHOST : 5432` in your logs, it means the PGHOST environment variable is incorrectly set to the port number. Our application will automatically detect and fix this, but you should still check your Railway environment variables to make sure they're set correctly.

#### SSL Configuration

Our application uses `{ rejectUnauthorized: false }` for SSL connections to accept Railway's self-signed certificates. If you continue having issues, you can try these alternatives:

- Using SSL with verification disabled:
  ```
  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/railway?sslmode=disable
  ```
  
- Using SSL with verification:
  ```
  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/railway?sslmode=require
  ```

### Debugging Tools

Our application provides several debugging tools to help diagnose database issues:

1. **Debug Endpoint**: Access `/api/debug/database-config` to see detailed database configuration information
2. **Troubleshooting Script**: Run `node scripts/railway-db-troubleshoot.js` in your Railway service's shell
3. **Health Check**: Visit `/api/health` to verify basic database connectivity

These tools will help you identify if your database is properly connected and what configuration variables are being used.

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