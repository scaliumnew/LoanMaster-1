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
```
git clone https://github.com/yourusername/loan-management-system.git
cd loan-management-system
```

2. Install dependencies
```
npm install
```

3. Set up the database
```
npm run db:push
```

4. Start the development server
```
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.