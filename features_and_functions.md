# Features and Functions Documentation: Budget Tracking Tool

This document provides a comprehensive list of features and functions available in the Smartelco Reengineering Budget Tracking Tool.

## 1. Dashboard & Analytics
- **Overview Dashboard**: A high-level view of project status, including:
  - **Stage Summary**: Visual breakdown of sites across different operational stages.
  - **Budget Summary**: Aggregated financial data (Total Harga, Budget Terpakai, Sisa Budget).
  - **Project Type Overview**: Performance metrics categorized by project type (Filter, Combat, etc.).
- **Interactive Map Widget**: A visual map displaying site locations with status-coded markers and cluster view.
- **KPI Management**:
  - **Operational KPIs**: Tracking performance metrics like lead times and stage completions.
  - **Financial KPIs**: real-time tracking of Total Budget, Used Budget, Remaining Budget, and Total Paid.
- **Global Search**: Unified search bar in the topbar to quickly locate sites or projects.

## 2. Site Management & Workflow
- **Site Master List**: A centralized table for all sites across all project types with advanced filtering and search capabilities.
- **Project-Specific Site Lists**: Dedicated views for different project types (e.g., Filter Sites, Combat Sites).
- **Site Detail View**: Comprehensive profile for each site, including:
  - Project information and technical specifications.
  - Integration with Termin & Payment tracking.
  - Activity history and status updates.
- **Workflow Automation**:
  - **Custom Flows**: Project-specific status flows (Blacksite, Combat, Filter, L2H, Refinen).
  - **Stage Updates**: Manual and bulk updates for site progress stages.
  - **Bulk Stage Update**: Excel-based bulk updating of site stages with validation.
- **Site Import**:
  - **Excel Import**: Bulk creation of sites via CSV/Excel upload.
  - **Merge Functionality**: Smart import that identifies existing records to prevent duplicates and allows updating specific fields.

## 3. Financial & Payment (Termin)
- **Termin Lifecycle Management**: A multi-step flow for managing payments:
  - **Termin Creation**: Initial application for payment milestones.
  - **Termin Review**: Internal approval process for payment requests.
  - **Termin Payment**: Final payment processing and verification.
- **Sequential 4-Step Payment Flow**: Specialized for Filter projects, ensuring strict adherence to the payment sequence.
- **Payment Prompting**: Dynamic Action Banners and Prompts to alert users of pending payment actions.
- **Financial Breakdowns**: Detailed views of budget usage per termin with hover tooltips for deeper insights.

## 4. Material & Procurement
- **Add Material via OCR**: 
  - Scan photos or documents (nota, DO, packing list) to automatically extract material names, specifications, and quantities.
  - Confidence Score indicator to warn users of potential inaccuracies.
- **Material Preview & Edit**: An editable table to review and correct OCR-extracted data before saving.
- **Manual Material Entry**: Fallback option for manual data entry of site materials.
- **Material Status Tracking**: Tracking materials from 'Ordered' to 'Installed' status.

## 5. Project & Resource Management
- **User Management**: Centralized hub for managing user accounts and roles.
- **Team & People Management**: 
  - Organization of personnel into functional teams.
  - Assignment of teams to specific sites or project areas.
- **Bulk Resource Import**: Import teams and people via Excel files.
- **Work Order (SPK) Management**:
  - Creation and tracking of Work Orders/SPK.
  - Support for SKP (Surat Keterangan Pembayaran) generation and receipt.

## 6. System & Infrastructure
- **Role-Based Access Control (RBAC)**: Defined access levels for different roles (Director, Operational, Admin, Finance, Field).
- **Multi-File Upload**: Robust component for uploading multiple documents and images across various stages.
- **Responsive Navigation**: Sidebar-based navigation with collapsed/expanded modes for optimized workspace.
- **Persistence Context**: Integration of historical data and knowledge items for better context management.
