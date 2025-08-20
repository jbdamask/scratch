import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload, Plus, Trash2 } from 'lucide-react'

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
  const [clients, setClients] = useState<Client[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
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
    fetchClients()
    fetchCompanies()
    fetchNextInvoiceNumber()
  }, [])

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
        if (data.length > 0 && invoice.company_id === 0) {
          setInvoice(prev => ({ ...prev, company_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
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
        // Clear any existing invoice items when uploading new worklog
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
    const items = worklogEntries.map(entry => ({
      description: `${entry.date}: ${entry.activities || 'Work performed'}`,
      quantity: entry.hours,
      rate: hourlyRate,
      amount: entry.hours * hourlyRate
    }))
    
    setInvoice(prev => ({ ...prev, items }))
    setShowWorklogView(false)
  }

  const getTotalHours = () => {
    return worklogEntries.reduce((sum, entry) => sum + entry.hours, 0)
  }

  const handleHourlyRateChange = (newRate: number) => {
    setHourlyRate(newRate)
    
    // Update existing invoice items with new rate
    if (invoice.items.length > 0) {
      setInvoice(prev => ({
        ...prev,
        items: prev.items.map(item => ({
          ...item,
          rate: newRate,
          amount: item.quantity * newRate
        }))
      }))
    }
  }

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 0, rate: 0, amount: 0 }]
    }))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
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
        const result = await response.json()
        alert(`Invoice created successfully! PDF and Markdown files have been saved.`)
        
        // Reset form
        setInvoice({
          invoice_number: '',
          client_id: 0,
          company_id: invoice.company_id,
          date: new Date().toISOString().split('T')[0],
          message: '',
          items: []
        })
        
        // Fetch next invoice number for the reset form
        fetchNextInvoiceNumber()
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Invoice Number</label>
                <Input
                  value={invoice.invoice_number}
                  onChange={(e) => setInvoice(prev => ({ ...prev, invoice_number: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  type="date"
                  value={invoice.date}
                  onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Client</label>
                <select
                  value={invoice.client_id}
                  onChange={(e) => setInvoice(prev => ({ ...prev, client_id: parseInt(e.target.value) }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

            <div>
              <label className="block text-sm font-medium mb-2">Message (Optional)</label>
              <Input
                value={invoice.message}
                onChange={(e) => setInvoice(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personalized message for the invoice"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Invoice Items</h3>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Hourly Rate:</label>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => handleHourlyRateChange(parseFloat(e.target.value) || 100)}
                      className="w-20"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button type="button" variant="outline" className="flex items-center gap-2">
                      <Upload size={16} />
                      Upload Worklog CSV
                    </Button>
                  </div>
                  <Button type="button" onClick={addItem} className="flex items-center gap-2">
                    <Plus size={16} />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {showWorklogView ? (
                  // Worklog View
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium">Worklog Entries</h4>
                      <Button onClick={convertWorklogToInvoiceItems} className="text-sm">
                        Convert to Invoice Items
                      </Button>
                    </div>
                    
                    {/* Worklog Column Headers */}
                    <div className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded text-sm font-medium">
                      <div className="col-span-2">Name</div>
                      <div className="col-span-2">Date</div>
                      <div className="col-span-6">Activities</div>
                      <div className="col-span-2">Hours</div>
                    </div>
                    
                    {worklogEntries.map((entry, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                        <div className="col-span-2">
                          <span className="text-sm">{entry.name}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm">{entry.date}</span>
                        </div>
                        <div className="col-span-6">
                          <span className="text-sm">{entry.activities}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm font-medium">{entry.hours}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total Hours: {getTotalHours()}</span>
                        <span className="text-lg font-semibold">
                          Total Amount: ${(getTotalHours() * hourlyRate).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Rate: ${hourlyRate}/hour
                      </div>
                    </div>
                  </>
                ) : (
                  // Invoice Items View
                  <>
                    {/* Column Headers */}
                    <div className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded text-sm font-medium">
                      <div className="col-span-5">Description</div>
                      <div className="col-span-2">Hours</div>
                      <div className="col-span-2">Rate</div>
                      <div className="col-span-2">Amount</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {invoice.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                        <div className="col-span-5">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Hours"
                            step="0.25"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Rate"
                            value={item.rate || ''}
                            onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={`$${item.amount.toFixed(2)}`}
                            disabled
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {invoice.items.length > 0 && (
                <div className="mt-4 text-right">
                  <div className="text-lg font-semibold">
                    Total: ${getTotalAmount().toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Invoice...' : 'Create Invoice'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}