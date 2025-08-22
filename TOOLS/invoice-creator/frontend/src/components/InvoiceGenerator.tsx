import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload, Plus, Trash2, FileText, Calendar, User, DollarSign, FileSpreadsheet, ArrowLeft } from 'lucide-react'

interface Client {
  id: number
  name: string
  address: string
  primary_contact: string
  phone_number: string
  email: string
}

interface Company {
  id: number
  name: string
  address: string
  primary_contact: string
  phone_number: string
  email: string
  logo_path: string
}

interface Invoice {
  id: number
  invoice_number: string
  client_id: number
  company_id: number
  date: string
  message: string
  total_amount: number
  pdf_path: string
  markdown_path: string
  created_at: string
}

interface InvoiceItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

interface WorklogEntry {
  name: string
  date: string
  activities: string
  hours: number
}

interface InvoiceForm {
  invoice_number: string
  client_id: number
  company_id: number
  date: string
  message: string
  items: InvoiceItem[]
}

export default function InvoiceGenerator() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceForm>({
    invoice_number: '',
    client_id: 0,
    company_id: 0,
    date: new Date().toISOString().split('T')[0],
    message: '',
    items: []
  })
  const [loading, setLoading] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(100)
  const [worklogEntries, setWorklogEntries] = useState<WorklogEntry[]>([])
  const [showWorklogView, setShowWorklogView] = useState(false)

  useEffect(() => {
    fetchInvoices()
    fetchClients()
    fetchCompanies()
    
    // Listen for new invoice event from header button
    const handleNewInvoice = () => {
      handleNewInvoiceClick()
    }
    
    window.addEventListener('newInvoice', handleNewInvoice)
    
    return () => {
      window.removeEventListener('newInvoice', handleNewInvoice)
    }
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('http://localhost:8000/invoices/')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await fetch('http://localhost:8000/invoices/next-number/')
      if (response.ok) {
        const data = await response.json()
        setInvoice(prev => ({ ...prev, invoice_number: data.next_invoice_number }))
      }
    } catch (error) {
      console.error('Error fetching next invoice number:', error)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch('http://localhost:8000/clients/')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await fetch('http://localhost:8000/companies/')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
        if (data.length > 0) {
          setInvoice(prev => ({ ...prev, company_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  const handleNewInvoiceClick = () => {
    setShowCreateForm(true)
    fetchNextInvoiceNumber()
  }

  const handleBackToList = () => {
    setShowCreateForm(false)
    setInvoice({
      invoice_number: '',
      client_id: 0,
      company_id: companies.length > 0 ? companies[0].id : 0,
      date: new Date().toISOString().split('T')[0],
      message: '',
      items: []
    })
    setWorklogEntries([])
    setShowWorklogView(false)
  }

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId)
    return client ? client.name : 'Unknown Client'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleInvoiceClick = (invoice: Invoice) => {
    // Just open PDF in new tab - simpler and more reliable
    window.open(`http://localhost:8000/invoices/${invoice.id}/pdf`, '_blank')
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/upload-worklog-csv/', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setWorklogEntries(data.worklog_entries)
        setShowWorklogView(true)
        setInvoice(prev => ({ ...prev, items: [] }))
        alert(`Worklog CSV uploaded successfully! Processed ${data.processed_entries} entries with ${data.total_hours} total hours.`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to upload CSV')
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert(`Error uploading worklog CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const convertWorklogToInvoiceItems = () => {
    const groupedByDate: { [key: string]: WorklogEntry[] } = {}
    worklogEntries.forEach(entry => {
      if (!groupedByDate[entry.date]) {
        groupedByDate[entry.date] = []
      }
      groupedByDate[entry.date].push(entry)
    })

    const items: InvoiceItem[] = Object.entries(groupedByDate).map(([date, entries]) => {
      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)
      const activities = entries.map(e => e.activities).join(', ')
      return {
        description: `${date}: ${activities}`,
        quantity: totalHours,
        rate: hourlyRate,
        amount: totalHours * hourlyRate
      }
    })

    setInvoice(prev => ({ ...prev, items }))
    setShowWorklogView(false)
    setWorklogEntries([])
  }

  const getTotalHours = () => {
    return worklogEntries.reduce((sum, entry) => sum + entry.hours, 0)
  }

  const handleHourlyRateChange = (newRate: number) => {
    setHourlyRate(newRate)
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        rate: newRate,
        amount: item.quantity * newRate
      }))
    }))
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      description: '',
      quantity: 0,
      rate: hourlyRate,
      amount: 0
    }
    setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      
      if (field === 'quantity' || field === 'rate') {
        newItems[index].amount = newItems[index].quantity * newItems[index].rate
      }
      
      return { ...prev, items: newItems }
    })
  }

  const removeItem = (index: number) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const getTotalAmount = () => {
    return invoice.items.reduce((sum, item) => sum + item.amount, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (invoice.client_id === 0) {
      alert('Please select a client')
      return
    }
    if (showWorklogView) {
      alert('Please convert worklog entries to invoice items first')
      return
    }
    
    if (invoice.items.length === 0) {
      alert('Please add at least one item')
      return
    }

    setLoading(true)

    try {
      const invoiceData = {
        ...invoice,
        total_amount: getTotalAmount(),
        date: new Date(invoice.date).toISOString()
      }

      const response = await fetch('http://localhost:8000/invoices/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      })

      if (response.ok) {
        alert(`Invoice created successfully! PDF and Markdown files have been saved.`)
        
        // Refresh invoices list and go back
        await fetchInvoices()
        handleBackToList()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert(`Error creating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // If showing create form, render the form
  if (showCreateForm) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '24px 32px', 
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                onClick={handleBackToList}
                style={{
                  padding: '8px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <FileText style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                  Create New Invoice
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                  Generate professional invoices for your clients
                </p>
              </div>
            </div>
          </div>

          {/* Form Content - Rest of the form stays the same */}
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            {/* Invoice Details Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                Invoice Details
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {/* Invoice Number - Auto-generated */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '8px' 
                  }}>
                    Invoice Number (Auto-generated)
                  </label>
                  <Input
                    value={invoice.invoice_number}
                    readOnly
                    style={{ 
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                {/* Date */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '8px' 
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar style={{ width: '16px', height: '16px' }} />
                      Invoice Date
                    </span>
                  </label>
                  <Input
                    type="date"
                    value={invoice.date}
                    onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
                    required
                    style={{ 
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Client */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '8px' 
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User style={{ width: '16px', height: '16px' }} />
                      Client
                    </span>
                  </label>
                  <select
                    value={invoice.client_id}
                    onChange={(e) => setInvoice(prev => ({ ...prev, client_id: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value={0}>Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Message (Optional)
                </label>
                <Input
                  value={invoice.message}
                  onChange={(e) => setInvoice(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Add a personalized message for the invoice"
                  style={{ 
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Invoice Items Section */}
            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '24px', 
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px' 
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <DollarSign style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                  Invoice Items
                </h3>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Hourly Rate */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    backgroundColor: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Hourly Rate:
                    </label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => handleHourlyRateChange(parseFloat(e.target.value) || 100)}
                      style={{ 
                        width: '80px',
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Upload CSV Button */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        width: '100%', 
                        height: '100%', 
                        opacity: 0, 
                        cursor: 'pointer' 
                      }}
                    />
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: 'white',
                        color: '#4b5563',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <FileSpreadsheet size={16} />
                      Upload CSV
                    </button>
                  </div>

                  {/* Add Item Button */}
                  <button
                    type="button"
                    onClick={addItem}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div>
                {showWorklogView ? (
                  // Worklog View (keep existing worklog code)
                  <>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '16px' 
                    }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '500', color: '#374151' }}>
                        Worklog Entries
                      </h4>
                      <button
                        type="button"
                        onClick={convertWorklogToInvoiceItems}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        Convert to Invoice Items
                      </button>
                    </div>
                    
                    {/* Worklog display code unchanged */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 2fr 6fr 2fr', 
                      gap: '12px', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      backgroundColor: 'white', 
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      <div>Name</div>
                      <div>Date</div>
                      <div>Activities</div>
                      <div style={{ textAlign: 'right' }}>Hours</div>
                    </div>
                    
                    {worklogEntries.map((entry, index) => (
                      <div key={index} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 2fr 6fr 2fr', 
                        gap: '12px', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        marginBottom: '4px'
                      }}>
                        <div>
                          <span style={{ fontSize: '14px', color: '#111827' }}>{entry.name}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '14px', color: '#6b7280' }}>{entry.date}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '14px', color: '#111827' }}>{entry.activities}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                            {entry.hours}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '16px', 
                      backgroundColor: '#dbeafe', 
                      borderRadius: '8px',
                      border: '1px solid #93c5fd'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                          Total Hours: {getTotalHours()}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                          Total Amount: ${(getTotalHours() * hourlyRate).toFixed(2)}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#3730a3', marginTop: '4px' }}>
                        Rate: ${hourlyRate}/hour
                      </div>
                    </div>
                  </>
                ) : (
                  // Invoice Items View
                  <>
                    {/* Column Headers */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '5fr 2fr 2fr 2fr 1fr', 
                      gap: '12px', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      backgroundColor: 'white', 
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      <div>Description</div>
                      <div>Hours</div>
                      <div>Rate</div>
                      <div>Amount</div>
                      <div></div>
                    </div>
                    
                    {invoice.items.length === 0 ? (
                      <div style={{ 
                        padding: '48px', 
                        textAlign: 'center',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px dashed #d1d5db'
                      }}>
                        <FileText style={{ 
                          width: '48px', 
                          height: '48px', 
                          color: '#d1d5db', 
                          margin: '0 auto 16px' 
                        }} />
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                          No items added yet. Add items manually or upload a CSV file.
                        </p>
                      </div>
                    ) : (
                      invoice.items.map((item, index) => (
                        <div key={index} style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '5fr 2fr 2fr 2fr 1fr', 
                          gap: '12px', 
                          alignItems: 'center', 
                          padding: '12px 16px', 
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          marginBottom: '4px'
                        }}>
                          <div>
                            <input
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              style={{ 
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              placeholder="Hours"
                              step="0.25"
                              value={item.quantity || ''}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              style={{ 
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Rate"
                              value={item.rate || ''}
                              onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                              style={{ 
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          <div>
                            <input
                              value={`$${item.amount.toFixed(2)}`}
                              disabled
                              style={{ 
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: '#f9fafb',
                                color: '#111827',
                                fontWeight: '500'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              style={{
                                padding: '8px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>

              {/* Total Amount */}
              {invoice.items.length > 0 && !showWorklogView && (
                <div style={{ 
                  marginTop: '24px', 
                  padding: '20px', 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  border: '2px solid #3b82f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                    Total Invoice Amount
                  </span>
                  <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
                    ${getTotalAmount().toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FileText size={20} />
              {loading ? 'Creating Invoice...' : 'Create Invoice'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Otherwise, show invoice list
  return (
    <div style={{ padding: '32px' }}>
      {invoices.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '64px',
          textAlign: 'center'
        }}>
          <FileText style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 24px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            No invoices yet
          </h3>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
            Create your first invoice to get started
          </p>
          <button
            onClick={handleNewInvoiceClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            Create First Invoice
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              onClick={() => handleInvoiceClick(invoice)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '24px',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                e.currentTarget.style.transform = 'translateY(0px)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                    Invoice #{invoice.invoice_number}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    {getClientName(invoice.client_id)}
                  </p>
                </div>
                <FileText size={24} color="#3b82f6" />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Date:</span>
                  <span style={{ fontSize: '14px', color: '#111827' }}>{formatDate(invoice.date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Amount:</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                    ${invoice.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {invoice.message && (
                <div style={{ 
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <p style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
                    "{invoice.message}"
                  </p>
                </div>
              )}
              
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                Created: {formatDate(invoice.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}