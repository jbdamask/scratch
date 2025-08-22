import { useState, useEffect } from 'react'
import { theme } from '@/theme'
import { Plus, Edit, Trash2, Users, Mail, Phone, MapPin, User, Building } from 'lucide-react'

interface Client {
  id?: number
  name: string
  address: string
  primary_contact: string
  phone_number: string
  email: string
}

interface Invoice {
  id: number
  invoice_number: string
  client_id: number
  company_id: number
  date: string
  message?: string
  total_amount: number
  status: string
  pdf_path?: string
  markdown_path?: string
  created_at: string
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const emptyClient: Client = {
    name: '',
    address: '',
    primary_contact: '',
    phone_number: '',
    email: ''
  }

  useEffect(() => {
    fetchClients()
    fetchInvoices()
    
    // Listen for add new client event from header button
    const handleAddNewClient = () => {
      setEditingClient(emptyClient)
      setShowForm(true)
    }
    
    window.addEventListener('addNewClient', handleAddNewClient)
    
    return () => {
      window.removeEventListener('addNewClient', handleAddNewClient)
    }
  }, [])

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

  const getClientTotals = (clientId: number) => {
    const clientInvoices = invoices.filter(invoice => invoice.client_id === clientId)
    const pendingTotal = clientInvoices
      .filter(invoice => (invoice.status || 'submitted') === 'submitted')
      .reduce((sum, invoice) => sum + invoice.total_amount, 0)
    const paidTotal = clientInvoices
      .filter(invoice => (invoice.status || 'submitted') === 'paid')
      .reduce((sum, invoice) => sum + invoice.total_amount, 0)
    
    return { pendingTotal, paidTotal }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClient) return

    setLoading(true)

    try {
      const url = editingClient.id 
        ? `http://localhost:8000/clients/${editingClient.id}`
        : 'http://localhost:8000/clients/'
      
      const method = editingClient.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingClient),
      })

      if (response.ok) {
        await fetchClients()
        await fetchInvoices() // Refresh invoices to get updated totals
        setEditingClient(null)
        setShowForm(false)
        alert('Client saved successfully!')
      } else {
        throw new Error('Failed to save client')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Error saving client')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setShowForm(true)
  }

  const handleDelete = async (clientId: number) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const response = await fetch(`http://localhost:8000/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchClients()
        await fetchInvoices() // Refresh invoices to get updated totals  
        alert('Client deleted successfully!')
      } else {
        throw new Error('Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error deleting client')
    }
  }

  const handleChange = (field: keyof Client, value: string) => {
    if (!editingClient) return
    setEditingClient(prev => prev ? { ...prev, [field]: value } : null)
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Add/Edit Form */}
      {showForm && editingClient && (
        <div style={{ 
          ...theme.card.base,
          marginBottom: '32px',
          overflow: 'hidden'
        }}>
          {/* Form Header */}
          <div style={{ 
            padding: '24px 32px', 
            borderBottom: `1px solid ${theme.colors.border.main}`,
            background: `linear-gradient(135deg, ${theme.colors.primary.main} 0%, ${theme.colors.secondary.main} 100%)`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Users style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'white' }}>
                {editingClient.id ? 'Edit Client' : 'Add New Client'}
              </h2>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            {/* Client Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: theme.colors.text.secondary, 
                marginBottom: '8px' 
              }}>
                Client Name
              </label>
              <input
                value={editingClient.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                style={{ 
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.border.main}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: theme.colors.background.card,
                  color: theme.colors.text.primary
                }}
              />
            </div>

            {/* Primary Contact */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: theme.colors.text.secondary, 
                marginBottom: '8px' 
              }}>
                Primary Contact
              </label>
              <input
                value={editingClient.primary_contact}
                onChange={(e) => handleChange('primary_contact', e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.border.main}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: theme.colors.background.card,
                  color: theme.colors.text.primary
                }}
              />
            </div>

            {/* Address */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: theme.colors.text.secondary, 
                marginBottom: '8px' 
              }}>
                Address
              </label>
              <input
                value={editingClient.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street, City, State, ZIP"
                style={{ 
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.border.main}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: theme.colors.background.card,
                  color: theme.colors.text.primary
                }}
              />
            </div>

            {/* Phone Number */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: theme.colors.text.secondary, 
                marginBottom: '8px' 
              }}>
                Phone Number
              </label>
              <input
                value={editingClient.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.border.main}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: theme.colors.background.card,
                  color: theme.colors.text.primary
                }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: theme.colors.text.secondary, 
                marginBottom: '8px' 
              }}>
                Email
              </label>
              <input
                type="email"
                value={editingClient.email}
                onChange={(e) => handleChange('email', e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.border.main}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: theme.colors.background.card,
                  color: theme.colors.text.primary
                }}
              />
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: loading ? theme.colors.gray[400] : theme.colors.secondary.main,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : 'Save Client'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingClient(null)
                  setShowForm(false)
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: theme.colors.background.card,
                  color: theme.colors.text.secondary,
                  border: `1px solid ${theme.colors.border.main}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Clients Grid - Only show when not in edit mode */}
      {!showForm && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: clients.length === 0 ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '24px' 
        }}>
          {clients.length === 0 ? (
            <div style={{ 
              backgroundColor: 'white', 
              padding: '64px', 
              borderRadius: '12px', 
              border: `1px dashed ${theme.colors.border.main}`,
              textAlign: 'center'
            }}>
              <Users style={{ 
                width: '48px', 
                height: '48px', 
                color: theme.colors.gray[400], 
                margin: '0 auto 16px' 
              }} />
              <p style={{ color: theme.colors.text.secondary, fontSize: '16px', marginBottom: '24px' }}>
                No clients yet. Add your first client to get started.
              </p>
              <button
                onClick={() => {
                  setEditingClient(emptyClient)
                  setShowForm(true)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: theme.colors.secondary.main,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary.dark}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary.main}
              >
                <Plus size={20} />
                Add First Client
              </button>
            </div>
          ) : (
            clients.map((client) => (
              <div 
                key={client.id}
                onClick={() => handleEdit(client)}
                style={{ 
                  backgroundColor: theme.colors.background.card, 
                  borderRadius: '12px', 
                  border: `1px solid ${theme.colors.border.main}`, 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Client Card Header */}
                <div style={{ 
                  padding: '20px 24px', 
                  borderBottom: `1px solid ${theme.colors.border.main}`,
                  background: `linear-gradient(135deg, ${theme.colors.gray[100]} 0%, ${theme.colors.background.card} 100%)`
                }}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ 
                      color: theme.colors.text.primary
                    }}>
                      <Building size={18} color={theme.colors.text.secondary} />
                      {client.name}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(client)
                        }}
                        style={{
                          padding: '8px',
                          backgroundColor: theme.colors.secondary.bg,
                          color: theme.colors.secondary.main,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.secondary.light
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.secondary.bg
                        }}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          client.id && handleDelete(client.id)
                        }}
                        style={{
                          padding: '8px',
                          backgroundColor: theme.colors.error.bg,
                          color: theme.colors.error.main,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.error.light
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.error.bg
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client Card Content */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {client.primary_contact && (
                      <div className="flex items-center gap-2">
                        <User size={16} color={theme.colors.text.secondary} />
                        <span className="text-sm" style={{ color: theme.colors.text.secondary }}>{client.primary_contact}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={16} color={theme.colors.text.secondary} />
                        <a 
                          href={`mailto:${client.email}`}
                          className="text-sm hover:underline"
                          style={{ 
                            color: theme.colors.secondary.main,
                            textDecoration: 'none'
                          }}
                        >
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.phone_number && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} color={theme.colors.text.secondary} />
                        <span className="text-sm" style={{ color: theme.colors.text.secondary }}>{client.phone_number}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={16} color={theme.colors.text.secondary} style={{ marginTop: '2px' }} />
                        <span className="text-sm leading-relaxed" style={{ color: theme.colors.text.secondary }}>{client.address}</span>
                      </div>
                    )}
                    
                    {/* Financial Summary */}
                    {client.id && (() => {
                      const { pendingTotal, paidTotal } = getClientTotals(client.id)
                      if (pendingTotal > 0 || paidTotal > 0) {
                        return (
                          <div style={{ 
                            marginTop: '16px', 
                            paddingTop: '16px', 
                            borderTop: `1px solid ${theme.colors.border.main}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            {pendingTotal > 0 && (
                              <div>
                                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>Pending: </span>
                                <span className="text-lg font-semibold" style={{ color: theme.colors.warning.main }}>
                                  ${pendingTotal.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {paidTotal > 0 && (
                              <div>
                                <span className="text-sm" style={{ color: theme.colors.text.secondary }}>Paid: </span>
                                <span className="text-lg font-semibold" style={{ color: theme.colors.success.main }}>
                                  ${paidTotal.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}