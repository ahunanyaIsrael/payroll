# Cardano Payroll System

A decentralized payroll management system built on the Cardano blockchain. This application enables companies to manage employee salaries through smart contracts, providing automated, trustless salary payments with transparent payment tracking.

![Cardano](https://img.shields.io/badge/Blockchain-Cardano-0033ad?style=for-the-badge&logo=cardano)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
- [Usage](#usage)
- [Smart Contracts](#smart-contracts)
- [Contributing](#contributing)
- [License](#license)

## Features

### For Employers/Admins

- **Add Employees** - Register new employees with their wallet addresses and salaries
- **View All Employees** - See all registered employees with their complete details
- **Update Salaries** - Modify employee salary information in real-time
- **Remove Employees** - Delete employees from the payroll system
- **Automated Payments** - Set up recurring salary payments through smart contracts
- **Payment Management** - Monitor all payroll transactions and payment history

### For Employees

- **View Personal Dashboard** - Check salary details and payment history
- **Withdraw Salary** - Claim your salary when it becomes available
- **Payment Tracking** - See next payment dates and historical withdrawals
- **Wallet Integration** - Connect with popular Cardano wallets (Lace, Flint, etc.)
- **Transaction Verification** - View all on-chain salary transactions

## Tech Stack

### Frontend

- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **React Icons** - Icon library
- **Lucid Cardano** - Cardano blockchain interaction library

### Smart Contracts

- **Plutus** - Smart contract language for Cardano
- **Haskell** - Language for Plutus development

### Development Tools

- **ESLint** - Code quality and linting
- **TypeScript Compiler** - Type checking and compilation

## Project Structure

```
payroll/
├── public/                 # Static files
├── src/
│   ├── components/        # Reusable React components
│   │   ├── NavBar/        # Navigation bar component
│   │   └── SideBar/       # Sidebar navigation
│   ├── pages/             # Page components
│   │   ├── Home/          # Landing page
│   │   ├── Employee/      # Employee details page
│   │   ├── Employer/      # Employer dashboard
│   │   ├── AddEmployee/   # Add new employee form
│   │   ├── ListEmployee/  # List all employees
│   │   └── UpdateEmployee/ # Update employee modal
│   ├── contexts/          # React context for state management
│   │   └── LucidContext.tsx # Blockchain context
│   ├── hooks/             # Custom React hooks
│   │   └── usePayroll.ts  # Payroll operations hook
│   ├── utils/             # Utility functions
│   │   ├── lucid.ts       # Lucid Cardano configuration
│   │   ├── data.tsx       # Data utilities
│   │   ├── validator.ts   # Input validation
│   │   ├── deleteEmployee.ts # Delete operations
│   │   ├── listEmployee.ts    # Fetch employee list
│   │   ├── updateEmployee.ts  # Update employee data
│   │   └── withdrawSalary.ts  # Salary withdrawal logic
│   ├── contract/          # Smart contracts
│   │   └── Payroll.hs     # Plutus payroll contract
│   ├── assets/            # Images and static assets
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # App entry point
│   └── index.css          # Global styles
├── eslint.config.js       # ESLint configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── package.json           # Project dependencies
└── README.md              # This file
```

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- A **Cardano wallet** (Lace, Flint, or compatible wallet)
- Access to a Cardano testnet or mainnet

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ahunanyaIsrael/cardano-payroll-system.git
   cd payroll
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure your environment**
   - Set up your Cardano wallet
   - Configure the network (testnet/mainnet) in your environment

## Development

### Start the development server

```bash
npm run dev
```

This will start the Vite development server, typically at `http://localhost:5173`.

### Code quality

Check for linting errors:

```bash
npm run lint
```

Fix linting issues (where possible):

```bash
npm run lint -- --fix
```

## Building

### Build for production

```bash
npm run build
```

This compiles TypeScript and bundles the application for production.

### Preview production build

```bash
npm run preview
```

## Usage

### For Employers

1. Connect your Cardano wallet
2. Navigate to the Employer dashboard
3. Add new employees with their wallet addresses and salary amounts
4. Set up payment schedules
5. Monitor all payroll transactions

### For Employees

1. Connect your Cardano wallet
2. View your dashboard with salary information
3. Withdraw available salary when ready
4. Track payment history and upcoming payments

## Smart Contracts

The payroll system uses Plutus smart contracts written in Haskell for secure, transparent salary management.

### Contract Features

- **Employee Registration** - Stores employee data on-chain
- **Salary Management** - Manages salary amounts and payment schedules
- **Automated Payments** - Triggers salary transfers at scheduled times
- **Access Control** - Ensures only authorized parties can modify payroll data
- **Transaction Verification** - All transactions are immutable and verifiable on the blockchain

For contract details, see `/src/contract/Payroll.hs`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for bugs and feature requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ on Cardano**
