from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import os
import shutil
from datetime import datetime
import uuid
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors

from database import get_db, init_db, Company as DBCompany, Client as DBClient, Invoice as DBInvoice, InvoiceItem as DBInvoiceItem, CompanyLogo as DBCompanyLogo
from models import Company, CompanyCreate, Client, ClientCreate, Invoice, InvoiceCreate, InvoiceItem, CompanyLogo
from worklog_processor import process_worklog_csv

app = FastAPI(title="Invoice Creator API")

# Create uploads directory if it doesn't exist (do this before mounting)
os.makedirs("uploads", exist_ok=True)

# Mount static files for serving uploaded images (must be after directory exists)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/companies/", response_model=List[Company])
def read_companies(db: Session = Depends(get_db)):
    companies = db.query(DBCompany).all()
    return companies

@app.post("/companies/", response_model=Company)
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    db_company = DBCompany(**company.dict())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@app.get("/companies/{company_id}", response_model=Company)
def read_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@app.put("/companies/{company_id}", response_model=Company)
def update_company(company_id: int, company: CompanyCreate, db: Session = Depends(get_db)):
    db_company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
    if db_company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    
    for key, value in company.dict().items():
        setattr(db_company, key, value)
    
    db.commit()
    db.refresh(db_company)
    return db_company

@app.post("/companies/{company_id}/logos/", response_model=CompanyLogo)
async def upload_company_logo(company_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Check if company exists
    company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Check if company already has 5 logos
    existing_logos = db.query(DBCompanyLogo).filter(DBCompanyLogo.company_id == company_id).all()
    if len(existing_logos) >= 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 logos allowed per company")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/svg+xml", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{company_id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join("uploads", unique_filename)
    
    # Save file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to database
    db_logo = DBCompanyLogo(
        company_id=company_id,
        file_name=file.filename,
        file_path=f"/uploads/{unique_filename}"
    )
    db.add(db_logo)
    db.commit()
    db.refresh(db_logo)
    
    return db_logo

@app.get("/companies/{company_id}/logos/", response_model=List[CompanyLogo])
def get_company_logos(company_id: int, db: Session = Depends(get_db)):
    logos = db.query(DBCompanyLogo).filter(DBCompanyLogo.company_id == company_id).all()
    return logos

@app.delete("/companies/{company_id}/logos/{logo_id}")
def delete_company_logo(company_id: int, logo_id: int, db: Session = Depends(get_db)):
    logo = db.query(DBCompanyLogo).filter(
        DBCompanyLogo.id == logo_id,
        DBCompanyLogo.company_id == company_id
    ).first()
    
    if logo is None:
        raise HTTPException(status_code=404, detail="Logo not found")
    
    # Delete file from disk
    file_path = logo.file_path.replace("/uploads/", "uploads/")
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete from database
    db.delete(logo)
    db.commit()
    
    return {"message": "Logo deleted successfully"}

@app.put("/companies/{company_id}/logos/{logo_id}/set-default")
def set_default_logo(company_id: int, logo_id: int, db: Session = Depends(get_db)):
    # Check if the logo exists and belongs to the company
    logo = db.query(DBCompanyLogo).filter(
        DBCompanyLogo.id == logo_id,
        DBCompanyLogo.company_id == company_id
    ).first()
    
    if logo is None:
        raise HTTPException(status_code=404, detail="Logo not found")
    
    # Set all other logos for this company to not default
    db.query(DBCompanyLogo).filter(DBCompanyLogo.company_id == company_id).update(
        {DBCompanyLogo.is_default: 0}
    )
    
    # Set this logo as default
    logo.is_default = 1
    db.commit()
    db.refresh(logo)
    
    return {"message": "Default logo set successfully"}

@app.get("/clients/", response_model=List[Client])
def read_clients(db: Session = Depends(get_db)):
    clients = db.query(DBClient).all()
    return clients

@app.post("/clients/", response_model=Client)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    db_client = DBClient(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.get("/clients/{client_id}", response_model=Client)
def read_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(DBClient).filter(DBClient.id == client_id).first()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.put("/clients/{client_id}", response_model=Client)
def update_client(client_id: int, client: ClientCreate, db: Session = Depends(get_db)):
    db_client = db.query(DBClient).filter(DBClient.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for key, value in client.dict().items():
        setattr(db_client, key, value)
    
    db.commit()
    db.refresh(db_client)
    return db_client

@app.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """Delete a client and check for associated invoices."""
    client = db.query(DBClient).filter(DBClient.id == client_id).first()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client has any invoices
    associated_invoices = db.query(DBInvoice).filter(DBInvoice.client_id == client_id).first()
    if associated_invoices:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete client with associated invoices. Please delete all invoices for this client first."
        )
    
    # Delete the client
    db.delete(client)
    db.commit()
    
    return {"message": f"Client '{client.name}' deleted successfully"}

@app.post("/upload-csv/")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    csv_reader = csv.DictReader(io.StringIO(contents.decode('utf-8')))
    
    items = []
    for row in csv_reader:
        try:
            quantity = float(row.get('quantity', 0))
            rate = float(row.get('rate', 0))
            amount = quantity * rate
            
            items.append({
                "description": row.get('description', ''),
                "quantity": quantity,
                "rate": rate,
                "amount": amount
            })
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid CSV format")
    
    return {"items": items}

@app.post("/upload-worklog-csv/")
async def upload_worklog_csv(file: UploadFile = File(...)):
    """
    Upload worklog CSV and return worklog entries.
    Expected CSV format: Name, Date, Billable Hours, Activities
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    
    try:
        # Process the worklog CSV
        worklog_data = process_worklog_csv(contents.decode('utf-8'))
        
        # Return worklog entries with proper field validation
        entries = []
        total_hours = 0
        for entry in worklog_data:
            try:
                hours = float(entry['hours'])
                total_hours += hours
                
                entries.append({
                    "name": entry['name'],
                    "date": entry['date'],
                    "activities": entry['activities'],
                    "hours": hours
                })
            except (ValueError, TypeError) as e:
                raise HTTPException(status_code=400, detail=f"Invalid hours value in worklog: {e}")
        
        return {
            "worklog_entries": entries, 
            "total_hours": total_hours,
            "processed_entries": len(worklog_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing worklog CSV: {str(e)}")

@app.get("/invoices/next-number/")
def get_next_invoice_number(db: Session = Depends(get_db)):
    """Get the next available invoice number."""
    last_invoice = db.query(DBInvoice).order_by(DBInvoice.invoice_number.desc()).first()
    
    if last_invoice:
        try:
            next_number = str(int(last_invoice.invoice_number) + 1)
        except ValueError:
            # If the last invoice number is not numeric, start from 1
            next_number = "1"
    else:
        next_number = "1"
    
    return {"next_invoice_number": next_number}

def create_date_folder():
    today = datetime.now()
    folder_name = today.strftime("%Y-%m-%d")
    folder_path = os.path.join(os.getcwd(), folder_name)
    
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    
    return folder_path

def generate_pdf(invoice_data: dict, company_data: dict, client_data: dict, items: list):
    folder_path = create_date_folder()
    filename = f"invoice_{invoice_data['invoice_number']}.pdf"
    file_path = os.path.join(folder_path, filename)
    
    doc = SimpleDocTemplate(
        file_path, 
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=1*inch,
        bottomMargin=1*inch
    )
    styles = getSampleStyleSheet()
    story = []
    
    # Main header layout matching wireframe
    main_layout_data = [
        # Row 1: Company Name (left) and INVOICE (right)
        [
            Paragraph(f"<b>{company_data['name']}</b>", ParagraphStyle('CompanyName', parent=styles['Heading1'], fontSize=20)),
            Paragraph(f"<b>INVOICE</b>", ParagraphStyle('InvoiceTitle', parent=styles['Heading1'], fontSize=20, alignment=2))
        ],
        # Row 2: Empty spacer
        ['', ''],
        # Row 3: From section (left) and Invoice details (right)
        [
            Paragraph(f"<b>From:</b><br/>{company_data.get('primary_contact', '')}<br/>{company_data.get('address', '')}<br/>{company_data.get('email', '')}<br/>{company_data.get('phone_number', '')}", 
                     ParagraphStyle('FromSection', parent=styles['Normal'], fontSize=10, leading=14)),
            Paragraph(f"<b>INVOICE: {invoice_data['invoice_number']}</b><br/><b>DATE: {invoice_data['date'].strftime('%m/%d/%y')}</b>", 
                     ParagraphStyle('InvoiceDetails', parent=styles['Normal'], fontSize=11, leading=14, alignment=2))
        ],
        # Row 4: Empty spacer
        ['', ''],
        # Row 5: To section (left) and FOR section (right)
        [
            Paragraph(f"<b>To:</b><br/>{client_data['name']}<br/>{client_data.get('address', '')}<br/>{client_data.get('email', '')}<br/>{client_data.get('phone_number', '')}", 
                     ParagraphStyle('ToSection', parent=styles['Normal'], fontSize=10, leading=14)),
            Paragraph(f"<b>FOR:</b><br/>Technology Consulting Services", 
                     ParagraphStyle('ForSection', parent=styles['Normal'], fontSize=10, leading=14, alignment=2))
        ]
    ]
    
    main_layout_table = Table(main_layout_data, colWidths=[4*inch, 3.5*inch])
    main_layout_table.setStyle(TableStyle([
        # General alignment
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),   # Left column left-aligned
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),  # Right column right-aligned
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),  # All cells top-aligned
        
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        
        # Spacer rows (smaller padding)
        ('TOPPADDING', (0, 1), (-1, 1), 2),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
        ('TOPPADDING', (0, 3), (-1, 3), 2),
        ('BOTTOMPADDING', (0, 3), (-1, 3), 2),
    ]))
    
    story.append(main_layout_table)
    story.append(Spacer(1, 25))
    
    # Create table data with proper formatting
    data = [['Description', 'Hours', 'Rate', 'Amount']]
    
    for item in items:
        # Use Paragraph for description to enable word wrapping
        desc_paragraph = Paragraph(item['description'], styles['Normal'])
        data.append([
            desc_paragraph,
            str(item['quantity']),
            f"${item['rate']:.2f}",
            f"${item['amount']:.2f}"
        ])
    
    # Calculate total hours
    total_hours = sum(item['quantity'] for item in items)
    
    # Add total row with proper alignment
    total_row = [
        Paragraph('<b>Total:</b>', styles['Normal']),
        Paragraph(f"<b>{total_hours}</b>", styles['Normal']),
        '',
        Paragraph(f"<b>${invoice_data['total_amount']:.2f}</b>", styles['Normal'])
    ]
    data.append(total_row)
    
    # Set column widths - description gets most space
    col_widths = [4.5*inch, 0.8*inch, 1*inch, 1*inch]
    
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows styling
        ('BACKGROUND', (0, 1), (-1, -2), colors.white),
        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),  # Center hours, rate, amount
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),     # Left align description
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('VALIGN', (0, 1), (-1, -1), 'TOP'),    # Top align for word wrapping
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 1), (-1, -1), 6),
        ('RIGHTPADDING', (0, 1), (-1, -1), 6),
        
        # Total row styling
        ('BACKGROUND', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('ALIGN', (0, -1), (2, -1), 'RIGHT'),   # Right align "Total:" text
        ('ALIGN', (3, -1), (3, -1), 'CENTER'),  # Center align total amount
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),  # Thicker line under header
    ]))
    
    story.append(table)
    story.append(Spacer(1, 20))
    
    # Create summary section (subtotal, discount, tax, total)
    summary_data = [
        ['', '', 'Subtotal', f"${invoice_data['total_amount']:.2f}"],
        ['', '', 'Discount', '$0.00'],
        ['', '', 'Tax', '$0.00'],
        ['', '', '', ''],  # Empty row for spacing
        ['', '', 'Total', f"${invoice_data['total_amount']:.2f}"],
        ['', '', '', ''],  # Empty row for spacing  
        ['', '', 'Amount Due', f"${invoice_data['total_amount']:.2f}"],
        ['', '', '(USD)', '']
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 1.5*inch, 1.5*inch, 1.3*inch])
    summary_table.setStyle(TableStyle([
        # Subtotal row
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica'),
        ('FONTNAME', (3, 0), (3, 0), 'Helvetica'),
        ('FONTSIZE', (2, 0), (-1, 0), 10),
        
        # Discount row  
        ('FONTNAME', (2, 1), (-1, 1), 'Helvetica'),
        ('FONTSIZE', (2, 1), (-1, 1), 10),
        
        # Tax row
        ('FONTNAME', (2, 2), (-1, 2), 'Helvetica'), 
        ('FONTSIZE', (2, 2), (-1, 2), 10),
        
        # Total row
        ('FONTNAME', (2, 4), (-1, 4), 'Helvetica-Bold'),
        ('FONTSIZE', (2, 4), (-1, 4), 11),
        ('LINEABOVE', (2, 4), (-1, 4), 1, colors.grey),
        
        # Amount Due row
        ('FONTNAME', (2, 6), (-1, 7), 'Helvetica-Bold'),
        ('FONTSIZE', (2, 6), (-1, 6), 12),
        ('LINEABOVE', (2, 6), (-1, 6), 2, colors.grey),
        ('TOPPADDING', (2, 6), (-1, 6), 8),
        
        # USD label
        ('FONTSIZE', (2, 7), (-1, 7), 9),
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 30))
    
    # Notes section
    notes_title = Paragraph('<b>Notes</b>', ParagraphStyle(
        'NotesTitle', 
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica-Bold',
        spaceAfter=8
    ))
    story.append(notes_title)
    
    # Only add notes content if there is a message
    if invoice_data.get('message'):
        notes_content = Paragraph(invoice_data['message'], ParagraphStyle(
            'NotesContent',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=20
        ))
        story.append(notes_content)
    else:
        # Add space even if no message to maintain layout
        story.append(Spacer(1, 10))
    
    # Terms section
    terms_title = Paragraph('<b>Terms</b>', ParagraphStyle(
        'TermsTitle',
        parent=styles['Normal'], 
        fontSize=12,
        fontName='Helvetica-Bold',
        spaceAfter=8
    ))
    story.append(terms_title)
    
    terms_content = Paragraph('Please make checks payable to Amroja LLC. Payments are due within 30 days of invoice receipt.', ParagraphStyle(
        'TermsContent',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=20
    ))
    story.append(terms_content)
    
    doc.build(story)
    return file_path

def generate_markdown(invoice_data: dict, company_data: dict, client_data: dict, items: list):
    folder_path = create_date_folder()
    filename = f"invoice_{invoice_data['invoice_number']}.md"
    file_path = os.path.join(folder_path, filename)
    
    markdown_content = f"""# INVOICE #{invoice_data['invoice_number']}

## From:
{company_data['name']}
{company_data.get('address', '')}
{company_data.get('primary_contact', '')}
{company_data.get('phone_number', '')}
{company_data.get('email', '')}

## To:
{client_data['name']}
{client_data.get('address', '')}
{client_data.get('primary_contact', '')}
{client_data.get('phone_number', '')}
{client_data.get('email', '')}

**Date:** {invoice_data['date'].strftime('%Y-%m-%d')}

"""
    
    if invoice_data.get('message'):
        markdown_content += f"**Message:** {invoice_data['message']}\n\n"
    
    markdown_content += "## Items\n\n"
    markdown_content += "| Description | Quantity | Rate | Amount |\n"
    markdown_content += "|-------------|----------|------|--------|\n"
    
    for item in items:
        markdown_content += f"| {item['description']} | {item['quantity']} | ${item['rate']:.2f} | ${item['amount']:.2f} |\n"
    
    markdown_content += f"\n**Total: ${invoice_data['total_amount']:.2f}**\n"
    
    with open(file_path, 'w') as f:
        f.write(markdown_content)
    
    return file_path

@app.post("/invoices/", response_model=Invoice)
def create_invoice(invoice: InvoiceCreate, db: Session = Depends(get_db)):
    company = db.query(DBCompany).filter(DBCompany.id == invoice.company_id).first()
    client = db.query(DBClient).filter(DBClient.id == invoice.client_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if invoice number already exists
    existing_invoice = db.query(DBInvoice).filter(DBInvoice.invoice_number == invoice.invoice_number).first()
    if existing_invoice:
        # Find the next available invoice number
        last_invoice = db.query(DBInvoice).order_by(DBInvoice.invoice_number.desc()).first()
        if last_invoice:
            try:
                next_number = str(int(last_invoice.invoice_number) + 1)
            except ValueError:
                next_number = "1"
        else:
            next_number = "1"
        
        raise HTTPException(
            status_code=400, 
            detail=f"Invoice number '{invoice.invoice_number}' already exists. Try using '{next_number}'"
        )
    
    db_invoice = DBInvoice(
        invoice_number=invoice.invoice_number,
        client_id=invoice.client_id,
        company_id=invoice.company_id,
        date=invoice.date,
        message=invoice.message,
        total_amount=invoice.total_amount
    )
    
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    for item in invoice.items:
        db_item = DBInvoiceItem(
            invoice_id=db_invoice.id,
            description=item.description,
            quantity=item.quantity,
            rate=item.rate,
            amount=item.amount
        )
        db.add(db_item)
    
    db.commit()
    
    company_dict = {
        'name': company.name,
        'address': company.address,
        'primary_contact': company.primary_contact,
        'phone_number': company.phone_number,
        'email': company.email
    }
    
    client_dict = {
        'name': client.name,
        'address': client.address,
        'primary_contact': client.primary_contact,
        'phone_number': client.phone_number,
        'email': client.email
    }
    
    invoice_dict = {
        'invoice_number': db_invoice.invoice_number,
        'date': db_invoice.date,
        'message': db_invoice.message,
        'total_amount': db_invoice.total_amount
    }
    
    items_list = [{
        'description': item.description,
        'quantity': item.quantity,
        'rate': item.rate,
        'amount': item.amount
    } for item in invoice.items]
    
    pdf_path = generate_pdf(invoice_dict, company_dict, client_dict, items_list)
    markdown_path = generate_markdown(invoice_dict, company_dict, client_dict, items_list)
    
    db_invoice.pdf_path = pdf_path
    db_invoice.markdown_path = markdown_path
    db.commit()
    db.refresh(db_invoice)
    
    return db_invoice

@app.get("/invoices/", response_model=List[Invoice])
def read_invoices(db: Session = Depends(get_db)):
    invoices = db.query(DBInvoice).all()
    return invoices

@app.get("/invoices/{invoice_id}", response_model=Invoice)
def read_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(DBInvoice).filter(DBInvoice.id == invoice_id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    items = db.query(DBInvoiceItem).filter(DBInvoiceItem.invoice_id == invoice_id).all()
    invoice.items = items
    
    return invoice

@app.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: int, download: bool = False, db: Session = Depends(get_db)):
    invoice = db.query(DBInvoice).filter(DBInvoice.id == invoice_id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    # Use FileResponse but set headers correctly for inline viewing
    headers = {}
    if download:
        # Force download
        headers["Content-Disposition"] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
    else:
        # Display inline in browser
        headers["Content-Disposition"] = f'inline; filename="invoice_{invoice.invoice_number}.pdf"'
    
    return FileResponse(
        path=invoice.pdf_path,
        media_type="application/pdf",
        headers=headers
    )

@app.put("/invoices/{invoice_id}/status")
def update_invoice_status(invoice_id: int, status: str, db: Session = Depends(get_db)):
    """Update invoice status."""
    allowed_statuses = ["draft", "pending", "paid", "overdue", "submitted"]  # Keep submitted for backwards compatibility
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(allowed_statuses)}")
    
    invoice = db.query(DBInvoice).filter(DBInvoice.id == invoice_id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = status
    db.commit()
    db.refresh(invoice)
    
    return {"message": f"Invoice status updated to {status}", "status": status}

@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Delete an invoice and its items."""
    invoice = db.query(DBInvoice).filter(DBInvoice.id == invoice_id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Delete associated invoice items first
    db.query(DBInvoiceItem).filter(DBInvoiceItem.invoice_id == invoice_id).delete()
    
    # Delete PDF and markdown files if they exist
    if invoice.pdf_path and os.path.exists(invoice.pdf_path):
        try:
            os.remove(invoice.pdf_path)
        except Exception as e:
            print(f"Warning: Could not delete PDF file {invoice.pdf_path}: {e}")
    
    if invoice.markdown_path and os.path.exists(invoice.markdown_path):
        try:
            os.remove(invoice.markdown_path)
        except Exception as e:
            print(f"Warning: Could not delete markdown file {invoice.markdown_path}: {e}")
    
    # Delete the invoice
    db.delete(invoice)
    db.commit()
    
    return {"message": f"Invoice #{invoice.invoice_number} deleted successfully"}

@app.post("/invoices/migrate-status")
def migrate_invoice_status(db: Session = Depends(get_db)):
    """Migrate existing invoices to have default status if missing."""
    # Update all invoices that have NULL or empty status
    null_updated_count = db.query(DBInvoice).filter(
        (DBInvoice.status == None) | (DBInvoice.status == "")
    ).update({"status": "submitted"})
    
    # Update all "sent" status to "pending" (consolidating statuses)
    sent_updated_count = db.query(DBInvoice).filter(
        DBInvoice.status == "sent"
    ).update({"status": "pending"})
    
    db.commit()
    
    return {
        "message": f"Updated {null_updated_count} invoices with default status and {sent_updated_count} 'sent' invoices to 'pending'", 
        "null_status_count": null_updated_count,
        "sent_to_pending_count": sent_updated_count
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)