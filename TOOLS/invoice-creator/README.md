# Invoice Creator

A full-stack web application for creating professional invoices with worklog CSV import functionality, built with FastAPI (backend) and React + Vite + Shadcn (frontend).

## Features

### Worklog CSV Import
- **Upload CSV Files**: Import worklog data with Name, Date, Activities, and Hours
- **Data Preview**: Review worklog entries before converting to invoice items
- **URL Cleaning**: Automatically removes URLs from activity descriptions
- **Total Calculations**: Shows total hours and amount before conversion

### Professional Invoice Generation
- **Clean PDF Output**: Black and white professional invoices with proper formatting
- **Markdown Export**: Text-based invoices for documentation
- **Real-time Calculations**: Automatic totals with configurable hourly rates
- **Date-organized Storage**: Files saved to date-specific folders (YYYY-MM-DD format)
- **Smart Invoice Numbering**: Automatic next number suggestion with duplicate prevention

### Client & Company Management
- **Company Setup**: Configure your business information (name, address, contact details)
- **Client Database**: Add, edit, and manage client information
- **Persistent Storage**: SQLite database for all data

### Data Storage
- SQLite database for persistent storage
- All invoices, clients, and company data stored locally
- Invoice files organized by creation date

## Project Structure

```
invoice-creator/
├── backend/
│   ├── .venv/               # Python virtual environment
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database models and setup
│   ├── models.py            # Pydantic models
│   ├── worklog_processor.py # CSV processing logic
│   ├── requirements.txt     # Python dependencies
│   └── invoices.db          # SQLite database (created on first run)
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── lib/        # Utilities
│   │   └── ...
│   └── ...
└── [YYYY-MM-DD]/       # Date-specific folders for generated invoices
    ├── invoice_*.pdf   # PDF invoices
    └── invoice_*.md    # Markdown invoices
```

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Installation

1. **Backend Setup:**
   ```bash
   # Virtual environment is already created
   # Dependencies are already installed
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   # Dependencies are already installed
   ```

### Running the Application

#### Option 1: Use the start script (recommended)
```bash
./start.sh
```

#### Option 2: Manual startup

**Terminal 1 - Backend:**
```bash
cd backend
source .venv/bin/activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Usage

### Creating an Invoice

1. **Company Setup**: Configure your company information in the Company tab
2. **Client Management**: Add your clients in the Clients tab  
3. **Upload Worklog CSV**: Use the "Upload Worklog CSV" button to import timesheet data
4. **Review Data**: The app displays worklog entries with columns for Name, Date, Activities, and Hours
5. **Set Hourly Rate**: Adjust the hourly rate as needed (updates all calculations in real-time)
6. **Convert to Invoice**: Click "Convert to Invoice Items" to transform worklog data into invoice line items
7. **Generate Invoice**: Fill in invoice details and click "Create Invoice" to generate PDF and Markdown files

### Worklog CSV Format

The app expects CSV files exported from my Notion WorkLog and will extract these columns:
- **Name**: Worker name  
- **Date**: Work date
- **Billable Hours**: Hours worked (column 3)
- **Activities**: Description of work performed (column 6)

Example worklog CSV:
```csv
Name,Date,Billable Hours,topic,Status,Activities,Billable Minutes,Amount,ID
"28 TARA, strategy, training","Aug 18, 2025",1.5,,,"TARA AI meeting (https://www.notion.so/TARA-AI-meeting-253c341c847680c1b989c0520eaaf24a?pvs=21), LinkedIn Learning for AI (https://www.notion.so/LinkedIn-Learning-for-AI-253c341c847680bda96ad498aa198486?pvs=21)",90,675,28
```

**Note**: URLs in activities are automatically cleaned during import.

## API Endpoints

### Companies
- `GET /companies/` - List all companies
- `POST /companies/` - Create a company
- `GET /companies/{id}` - Get specific company
- `PUT /companies/{id}` - Update company

### Clients
- `GET /clients/` - List all clients
- `POST /clients/` - Create a client
- `GET /clients/{id}` - Get specific client
- `PUT /clients/{id}` - Update client

### Invoices
- `POST /upload-worklog-csv/` - Upload worklog CSV files
- `GET /invoices/next-number/` - Get next available invoice number
- `POST /invoices/` - Create an invoice
- `GET /invoices/` - List all invoices
- `GET /invoices/{id}` - Get specific invoice

## Invoice Output

Generated invoices include:

### File Formats
1. **PDF Version**: Professional black and white PDF using ReportLab
2. **Markdown Version**: Text-based invoice in Markdown format

### Invoice Layout
- **Header**: Company name, client info, invoice number, date
- **Service Section**: "FOR: Technology Consulting Services"
- **Line Items**: Date-prefixed descriptions, hours, rate, amounts with totals
- **Summary**: Subtotal, discount, tax, total, amount due (USD)
- **Notes**: Custom messages (if provided)
- **Terms**: "Please make checks payable to Amroja LLC. Payments are due within 30 days of invoice receipt."

Both files are saved in a folder named with today's date (e.g., `2025-08-19/`) in the application root directory.

## Technologies Used

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM
- **SQLite**: Lightweight database
- **ReportLab**: PDF generation
- **Pydantic**: Data validation

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Shadcn/ui**: Component library
- **Lucide React**: Icons

## Development Notes

- The application uses a virtual environment for Python dependencies
- Frontend uses modern ES modules and TypeScript
- Minimalist UI design as specified
- All invoice generation includes both PDF and Markdown formats
- Files are organized by date for easy management