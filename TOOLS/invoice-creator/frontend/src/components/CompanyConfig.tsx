import { useState, useEffect } from 'react'

interface CompanyLogo {
  id: number
  company_id: number
  file_name: string
  file_path: string
  is_default: boolean
  uploaded_at: string
}

interface Company {
  id?: number
  name: string
  address: string
  primary_contact: string
  phone_number: string
  email: string
  logo_path: string
  logos?: CompanyLogo[]
}

export default function CompanyConfig() {
  const [company, setCompany] = useState<Company>({
    name: '',
    address: '',
    primary_contact: '',
    phone_number: '',
    email: '',
    logo_path: '',
    logos: []
  })
  const [loading, setLoading] = useState(false)
  const [tempLogos, setTempLogos] = useState<File[]>([])

  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    try {
      const response = await fetch('http://localhost:8000/companies/')
      if (response.ok) {
        const companies = await response.json()
        if (companies.length > 0) {
          const companyData = companies[0]
          // Fetch logos for the company
          if (companyData.id) {
            const logosResponse = await fetch(`http://localhost:8000/companies/${companyData.id}/logos/`)
            if (logosResponse.ok) {
              const logos = await logosResponse.json()
              companyData.logos = logos
            }
          }
          setCompany(companyData)
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
      // Save/update company information
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

      if (!response.ok) {
        throw new Error('Failed to save company information')
      }

      const savedCompany = await response.json()
      
      // Upload any temporary logos
      if (tempLogos.length > 0) {
        for (const file of tempLogos) {
          const formData = new FormData()
          formData.append('file', file)
          
          await fetch(`http://localhost:8000/companies/${savedCompany.id}/logos/`, {
            method: 'POST',
            body: formData
          })
        }
        
        setTempLogos([])
        
        // Fetch updated logos
        const logosResponse = await fetch(`http://localhost:8000/companies/${savedCompany.id}/logos/`)
        if (logosResponse.ok) {
          const logos = await logosResponse.json()
          savedCompany.logos = logos
        }
      }
      
      setCompany(savedCompany)
      alert('Company information saved successfully!')
      
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

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const totalLogos = (company.logos?.length || 0) + tempLogos.length
    if (totalLogos >= 5) {
      alert('Maximum of 5 logos allowed')
      return
    }

    setTempLogos(prev => [...prev, file])
  }

  const handleRemoveTempLogo = (index: number) => {
    setTempLogos(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteLogo = async (logoId: number) => {
    if (!company.id || !confirm('Are you sure you want to delete this logo?')) return

    try {
      const response = await fetch(`http://localhost:8000/companies/${company.id}/logos/${logoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCompany(prev => ({
          ...prev,
          logos: prev.logos?.filter(logo => logo.id !== logoId) || []
        }))
      }
    } catch (error) {
      console.error('Error deleting logo:', error)
    }
  }

  const handleSetDefaultLogo = async (logoId: number) => {
    if (!company.id) return

    try {
      const response = await fetch(`http://localhost:8000/companies/${company.id}/logos/${logoId}/set-default`, {
        method: 'PUT'
      })

      if (response.ok) {
        setCompany(prev => ({
          ...prev,
          logos: prev.logos?.map(logo => ({
            ...logo,
            is_default: logo.id === logoId
          })) || []
        }))
      }
    } catch (error) {
      console.error('Error setting default logo:', error)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* Company Name */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="name" style={labelStyle}>
            Company Name
          </label>
          <input
            id="name"
            type="text"
            value={company.name}
            onChange={(e) => handleChange('name', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Primary Contact */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="contact" style={labelStyle}>
            Primary Contact
          </label>
          <input
            id="contact"
            type="text"
            value={company.primary_contact}
            onChange={(e) => handleChange('primary_contact', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Address */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="address" style={labelStyle}>
            Business Address
          </label>
          <input
            id="address"
            type="text"
            value={company.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Street, City, State, ZIP"
            style={inputStyle}
          />
        </div>

        {/* Phone Number */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="phone" style={labelStyle}>
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={company.phone_number}
            onChange={(e) => handleChange('phone_number', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="email" style={labelStyle}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={company.email}
            onChange={(e) => handleChange('email', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Logo Upload Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>
            Company Logos (Max 5)
          </label>
          
          {/* Upload Button */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ display: 'none' }}
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: ((company.logos?.length || 0) + tempLogos.length) >= 5 ? '#e5e7eb' : '#3b82f6',
                color: ((company.logos?.length || 0) + tempLogos.length) >= 5 ? '#9ca3af' : 'white',
                borderRadius: '6px',
                cursor: ((company.logos?.length || 0) + tempLogos.length) >= 5 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {((company.logos?.length || 0) + tempLogos.length) >= 5 ? 'Maximum logos reached' : 'Upload Logo'}
            </label>
          </div>

          {/* Logo Display */}
          {((company.logos && company.logos.length > 0) || tempLogos.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {/* Existing Logos */}
              {company.logos?.map((logo) => (
                <div
                  key={logo.id}
                  style={{
                    border: logo.is_default ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: 'white'
                  }}
                >
                  <img
                    src={`http://localhost:8000${logo.file_path}`}
                    alt={logo.file_name}
                    style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                    {logo.is_default && (
                      <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '4px' }}>
                        ★ Default
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSetDefaultLogo(logo.id)}
                      style={{
                        padding: '2px 8px',
                        marginRight: '4px',
                        fontSize: '11px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Set Default
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLogo(logo.id)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#dc2626'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {/* Temporary Logos */}
              {tempLogos.map((file, index) => (
                <div
                  key={`temp-${index}`}
                  style={{
                    border: '1px dashed #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                    <div style={{ color: '#f59e0b', marginBottom: '4px' }}>Pending</div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTempLogo(index)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#dc2626'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 24px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Saving...' : 'Save Company Information'}
        </button>
      </form>
    </div>
  )
}