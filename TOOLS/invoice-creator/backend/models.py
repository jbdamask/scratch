from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class CompanyBase(BaseModel):
    name: str
    address: Optional[str] = None
    primary_contact: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    logo_path: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    name: str
    address: Optional[str] = None
    primary_contact: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class InvoiceItemBase(BaseModel):
    description: str
    quantity: float
    rate: float
    amount: float

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItem(InvoiceItemBase):
    id: int
    invoice_id: int
    
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    invoice_number: str
    client_id: int
    company_id: int
    date: datetime
    message: Optional[str] = None
    total_amount: float

class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]

class Invoice(InvoiceBase):
    id: int
    pdf_path: Optional[str] = None
    markdown_path: Optional[str] = None
    created_at: datetime
    items: List[InvoiceItem] = []
    
    class Config:
        from_attributes = True