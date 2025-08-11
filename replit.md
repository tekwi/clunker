# Car Cash Offer App

## Overview

A mobile-first web application that allows users to submit unwanted cars for cash offers. Users can upload vehicle details, photos, and location information through an intuitive form interface. The app provides a unique link system for viewing submissions and enables admin users to create cash offers for submitted vehicles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and developer experience
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **File Uploads**: Uppy for handling multiple file uploads with progress tracking and AWS S3 integration

### Backend Architecture
- **Runtime**: Node.js with Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless for scalable data storage
- **File Storage**: Google Cloud Storage for uploaded vehicle photos
- **Validation**: Zod schemas shared between frontend and backend for consistent validation

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon with connection pooling
- **Schema Design**: Three main entities:
  - Submissions: Core vehicle submission data (VIN, owner info, location, condition)
  - Pictures: Multiple photos per submission with cloud storage URLs
  - Offers: Cash offers linked to submissions with pricing and notes
- **File Storage**: Google Cloud Storage for scalable image hosting with ACL-based access control

### Authentication and Authorization
- **Current State**: No authentication system implemented
- **Access Control**: Object-level ACL system prepared for future implementation
- **Security**: Prepared infrastructure for role-based access (admin vs user permissions)

### External Dependencies
- **Database**: Neon PostgreSQL serverless database
- **File Storage**: Google Cloud Storage with Replit sidecar integration
- **UI Components**: Radix UI primitives for accessibility
- **Development Tools**: Vite for fast development and building
- **Email Integration**: Placeholder system ready for external email API integration
- **Location Services**: HTML5 Geolocation API for automatic location detection

### Key Design Decisions

**Mobile-First Approach**: Prioritizes mobile user experience with touch-friendly interfaces and responsive design patterns, addressing the primary use case of users photographing vehicles with mobile devices.

**Type Safety**: Shared Zod schemas between frontend and backend ensure consistent data validation and reduce runtime errors through compile-time type checking.

**File Upload Strategy**: Uppy integration provides robust file handling with features like drag-and-drop, progress tracking, and direct cloud storage uploads, essential for the photo-heavy nature of vehicle submissions.

**Database Relationships**: Normalized schema design allows for multiple photos per submission and maintains referential integrity while supporting future features like multiple offers per vehicle.

**Serverless Architecture**: Neon PostgreSQL and cloud storage solutions provide automatic scaling without infrastructure management overhead.