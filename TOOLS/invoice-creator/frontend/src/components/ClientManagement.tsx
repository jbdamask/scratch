import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Mail, Phone, MapPin, User, Building } from 'lucide-react'

interface Client {
  id?: number
  name: string
  address: string
  primary_contact: string
  phone_number: string
  email: string
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
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
      {/* Header Section */}
      <div style={{ 
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '8px'
          }}>
            Client Management
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Manage your client relationships and contact information
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClient(emptyClient)
            setShowForm(true)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          <Plus size={20} />
          Add New Client
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && editingClient && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '32px',
          overflow: 'hidden'
        }}>
          {/* Form Header */}
          <div style={{ 
            padding: '24px 32px', 
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
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
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
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
                color: '#374151', 
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
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>

            {/* Primary Contact */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
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
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>

            {/* Address */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
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
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>

            {/* Phone Number */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
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
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
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
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
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
                  backgroundColor: loading ? '#9ca3af' : '#3b82f6',
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
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
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
              border: '1px dashed #d1d5db',
              textAlign: 'center'
            }}>
              <Users style={{ 
                width: '48px', 
                height: '48px', 
                color: '#d1d5db', 
                margin: '0 auto 16px' 
              }} />
              <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '24px' }}>
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
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
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
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e7eb', 
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
                  borderBottom: '1px solid #e5e7eb',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Building size={18} color="#6b7280" />
                      {client.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(client)
                        }}
                        style={{
                          padding: '8px',
                          backgroundColor: '#eff6ff',
                          color: '#3b82f6',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dbeafe'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff'
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fca5a5'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fee2e2'
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="#6b7280" />
                        <span style={{ fontSize: '14px', color: '#374151' }}>{client.primary_contact}</span>
                      </div>
                    )}
                    {client.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} color="#6b7280" />
                        <a 
                          href={`mailto:${client.email}`}
                          style={{ 
                            fontSize: '14px', 
                            color: '#3b82f6',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.phone_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={16} color="#6b7280" />
                        <span style={{ fontSize: '14px', color: '#374151' }}>{client.phone_number}</span>
                      </div>
                    )}
                    {client.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <MapPin size={16} color="#6b7280" style={{ marginTop: '2px' }} />
                        <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>{client.address}</span>
                      </div>
                    )}
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