# Arisan API Setup

This project is an Arisan API built with **Express.js**, **MySQL**, and **Prisma**. Monitoring and observability are supported via **Grafana**.

## Prerequisites

- Node.js & npm
- MySQL server
- [Grafana](https://grafana.com/) (optional, for monitoring)

## Configuration

Create a `.env` file in the project root with your database connection string:

```env
DATABASE_URL="mysql://root:@localhost:3306/belajar_typescript_restful_api"
```

## Installation & Setup

```shell
npm install

npx prisma migrate dev

npx prisma generate

npm run build

npm run start
```

## Monitoring

To enable monitoring, configure Grafana to connect to your MySQL database or other relevant data sources.
