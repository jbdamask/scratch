import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Company {
  id?: number
  name: string
  address: string
  primary_contact: string
  phone_number: string
  email: string
  logo_path: string
}

export default function CompanyConfig() {
  const [company, setCompany] = useState<Company>({
    name: '',
    address: '',
    primary_contact: '',
    phone_number: '',
    email: '',
    logo_path: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    try {
      const response = await fetch('http://localhost:8000/companies/')
      if (response.ok) {
        const companies = await response.json()
        if (companies.length > 0) {
          setCompany(companies[0])
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = company.id 
        ? `http://localhost:8000/companies/${company.id}`
        : 'http://localhost:8000/companies/'
      
      const method = company.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(company),
      })

      if (response.ok) {
        const updatedCompany = await response.json()
        setCompany(updatedCompany)
        alert('Company information saved successfully!')
      } else {
        throw new Error('Failed to save company information')
      }
    } catch (error) {
      console.error('Error saving company:', error)
      alert('Error saving company information')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof Company, value: string) => {
    setCompany(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <Input
                value={company.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input
                value={company.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street, City, State, ZIP"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Primary Contact</label>
              <Input
                value={company.primary_contact}
                onChange={(e) => handleChange('primary_contact', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <Input
                value={company.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={company.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Logo Path</label>
              <Input
                value={company.logo_path}
                onChange={(e) => handleChange('logo_path', e.target.value)}
                placeholder="Path to company logo"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Company Information'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}