from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLITE_DATABASE_URL = "sqlite:///./invoices.db"

engine = create_engine(SQLITE_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(Text)
    primary_contact = Column(String)
    phone_number = Column(String)
    email = Column(String)
    logo_path = Column(String)  # Keep for backward compatibility
    created_at = Column(DateTime, default=datetime.utcnow)
    
    logos = relationship("CompanyLogo", back_populates="company", cascade="all, delete-orphan")

class CompanyLogo(Base):
    __tablename__ = "company_logos"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    is_default = Column(Integer, default=0)  # Using Integer for SQLite compatibility (0=False, 1=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="logos")

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(Text)
    primary_contact = Column(String)
    phone_number = Column(String)
    email = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False)
    client_id = Column(Integer, nullable=False)
    company_id = Column(Integer, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    message = Column(Text)
    total_amount = Column(Float)
    status = Column(String, default="draft", nullable=False)  # draft, sent, pending, paid, overdue
    pdf_path = Column(String)
    markdown_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)