import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'

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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Client Management</h1>
          <Button 
            onClick={() => {
              setEditingClient(emptyClient)
              setShowForm(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Add Client
          </Button>
        </div>
      </div>

      {showForm && editingClient && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingClient.id ? 'Edit Client' : 'Add New Client'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Client Name</label>
                  <Input
                    value={editingClient.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Primary Contact</label>
                  <Input
                    value={editingClient.primary_contact}
                    onChange={(e) => handleChange('primary_contact', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    value={editingClient.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Street, City, State, ZIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <Input
                    value={editingClient.phone_number}
                    onChange={(e) => handleChange('phone_number', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Client'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setEditingClient(null)
                    setShowForm(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {client.name}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(client)}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => client.id && handleDelete(client.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {client.address && <p><strong>Address:</strong> {client.address}</p>}
                {client.primary_contact && <p><strong>Contact:</strong> {client.primary_contact}</p>}
                {client.phone_number && <p><strong>Phone:</strong> {client.phone_number}</p>}
                {client.email && <p><strong>Email:</strong> {client.email}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}