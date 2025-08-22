import { useState, useEffect } from 'react'
import { theme } from '@/theme'
import { ArrowLeft, Building, User, Mail, Phone, MapPin, FileText, Trash2, Eye, Download, MoreHorizontal } from 'lucide-react'

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

interface ClientDetailProps {
  clientId: number
  onBack: () => void
}

export default function ClientDetail({ clientId, onBack }: ClientDetailProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [activeTab, setActiveTab] = useState<'table' | 'board'>('table')
  const [loading, setLoading] = useState(true)
  const [draggedInvoice, setDraggedInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchClient()
    fetchInvoices()
  }, [clientId])

  const fetchClient = async () => {
    try {
      const response = await fetch(`http://localhost:8000/clients/${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setClient(data)
      }
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await fetch('http://localhost:8000/invoices/')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.filter((invoice: Invoice) => invoice.client_id === clientId))
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const updateInvoiceStatus = async (invoiceId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/invoices/${invoiceId}/status?status=${newStatus}`, {
        method: 'PUT'
      })

      if (response.ok) {
        setInvoices(prev => 
          prev.map(invoice => 
            invoice.id === invoiceId 
              ? { ...invoice, status: newStatus }
              : invoice
          )
        )
      } else {
        throw new Error('Failed to update invoice status')
      }
    } catch (error) {
      console.error('Error updating invoice status:', error)
      alert('Error updating invoice status')
    }
  }

  const handleDeleteInvoice = async (invoiceId: number, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice #${invoiceNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:8000/invoices/${invoiceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchInvoices()
        alert(`Invoice #${invoiceNumber} deleted successfully!`)
      } else {
        throw new Error('Failed to delete invoice')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Error deleting invoice')
    }
  }

  const handleInvoiceClick = (invoice: Invoice) => {
    window.open(`http://localhost:8000/invoices/${invoice.id}/pdf`, '_blank')
  }

  const getStatusDisplay = (status: string | undefined) => {
    const actualStatus = status || 'draft'
    const statusConfig = {
      'draft': { label: 'Draft', colors: theme.colors.draft },
      'pending': { label: 'Pending', colors: theme.colors.warning },
      'paid': { label: 'Paid', colors: theme.colors.success },
      'overdue': { label: 'Overdue', colors: theme.colors.error },
      'sent': { label: 'Pending', colors: theme.colors.warning }
    }
    return statusConfig[actualStatus] || statusConfig['draft']
  }

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, {label: string, icon: string, colors: any}> = {
      'draft': { label: 'Draft', icon: '📝', colors: theme.status.draft },
      'pending': { label: 'Pending', icon: '⏳', colors: theme.status.pending },
      'paid': { label: 'Paid', icon: '✅', colors: theme.status.paid },
      'overdue': { label: 'Overdue', icon: '🚨', colors: theme.status.overdue },
      'sent': { label: 'Pending', icon: '⏳', colors: theme.status.pending }
    }
    return statusMap[status] || statusMap['draft']
  }

  const handleDragStart = (e: React.DragEvent, invoice: Invoice) => {
    setDraggedInvoice(invoice)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedInvoice(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (draggedInvoice && draggedInvoice.status !== targetStatus) {
      updateInvoiceStatus(draggedInvoice.id, targetStatus)
    }
    setDraggedInvoice(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: theme.colors.text.secondary }}>Loading client details...</div>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ color: theme.colors.text.secondary, marginBottom: '24px' }}>Client not found</div>
        <button
          onClick={onBack}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.colors.secondary.main,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Clients
        </button>
      </div>
    )
  }

  const InvoiceCard = ({ invoice, statusColor }: { invoice: Invoice, statusColor: string }) => (
    <div
      key={invoice.id}
      draggable
      onDragStart={(e) => handleDragStart(e, invoice)}
      onDragEnd={handleDragEnd}
      style={{
        backgroundColor: draggedInvoice?.id === invoice.id ? theme.colors.gray[100] : theme.colors.background.card,
        border: `1px solid ${theme.colors.border.main}`,
        borderRadius: '8px',
        padding: '12px',
        cursor: 'move',
        transition: 'all 0.2s',
        opacity: draggedInvoice?.id === invoice.id ? 0.5 : 1,
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (draggedInvoice?.id !== invoice.id) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleDeleteInvoice(invoice.id, invoice.invoice_number)
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: theme.colors.error.bg,
          color: theme.colors.error.main,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          transition: 'all 0.2s',
          opacity: 0.7
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.backgroundColor = theme.colors.error.main
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7'
          e.currentTarget.style.backgroundColor = theme.colors.error.bg
          e.currentTarget.style.color = theme.colors.error.main
        }}
      >
        <Trash2 size={12} />
      </button>

      <div 
        onClick={() => handleInvoiceClick(invoice)}
        style={{ paddingRight: '30px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: theme.colors.text.primary, margin: 0 }}>
            #{invoice.invoice_number}
          </h4>
          <span style={{ fontSize: '12px', fontWeight: '600', color: statusColor }}>
            ${invoice.total_amount.toFixed(2)}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: theme.colors.gray[400], margin: 0 }}>
          {formatDate(invoice.date)}
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '32px' }}>
      {/* Header with back button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '32px',
        padding: '24px',
        backgroundColor: theme.colors.background.card,
        borderRadius: '12px',
        border: `1px solid ${theme.colors.border.main}`
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px',
            backgroundColor: theme.colors.gray[100],
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ArrowLeft size={20} color={theme.colors.text.secondary} />
        </button>
        
        <div style={{ 
          width: '64px', 
          height: '64px', 
          backgroundColor: theme.colors.secondary.bg, 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Building style={{ width: '32px', height: '32px', color: theme.colors.secondary.main }} />
        </div>
        
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: theme.colors.text.primary, 
            marginBottom: '8px' 
          }}>
            {client.name}
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {client.primary_contact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} color={theme.colors.text.secondary} />
                <span style={{ color: theme.colors.text.secondary }}>{client.primary_contact}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '24px' }}>
              {client.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={16} color={theme.colors.text.secondary} />
                  <a 
                    href={`mailto:${client.email}`}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={16} color={theme.colors.text.secondary} />
                  <span style={{ color: theme.colors.text.secondary }}>{client.phone_number}</span>
                </div>
              )}
            </div>
            {client.address && (
              <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                <MapPin size={16} color={theme.colors.text.secondary} style={{ marginTop: '2px' }} />
                <span style={{ color: theme.colors.text.secondary, lineHeight: '1.5' }}>{client.address}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: theme.colors.text.secondary, marginBottom: '4px' }}>
            Total Invoices
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.primary }}>
            {invoices.length}
          </div>
        </div>
      </div>

      {/* Invoice Section */}
      <div style={{ 
        ...theme.card.base,
        padding: '24px'
      }}>
        {/* Tab Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          borderBottom: `1px solid ${theme.colors.border.main}`,
          paddingBottom: '16px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.text.primary }}>
            Invoices
          </h2>
          
          {/* Tab Navigation */}
          <div style={{ display: 'flex', backgroundColor: theme.colors.gray[100], borderRadius: '8px', padding: '4px' }}>
            <button
              onClick={() => setActiveTab('table')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'table' ? theme.colors.background.card : 'transparent',
                color: activeTab === 'table' ? theme.colors.text.primary : theme.colors.text.secondary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: activeTab === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Table View
            </button>
            <button
              onClick={() => setActiveTab('board')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'board' ? theme.colors.background.card : 'transparent',
                color: activeTab === 'board' ? theme.colors.text.primary : theme.colors.text.secondary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: activeTab === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Board View
            </button>
          </div>
        </div>

        {/* Content */}
        {invoices.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '64px', 
            color: theme.colors.text.secondary 
          }}>
            <FileText style={{ 
              width: '64px', 
              height: '64px', 
              color: theme.colors.gray[400], 
              margin: '0 auto 16px' 
            }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No invoices yet
            </h3>
            <p>This client doesn't have any invoices created yet.</p>
          </div>
        ) : activeTab === 'table' ? (
          /* Table View */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: theme.colors.gray[50] }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: theme.colors.text.secondary,
                    borderBottom: `1px solid ${theme.colors.border.main}`
                  }}>Invoice</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: theme.colors.text.secondary,
                    borderBottom: `1px solid ${theme.colors.border.main}`
                  }}>Amount</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: theme.colors.text.secondary,
                    borderBottom: `1px solid ${theme.colors.border.main}`
                  }}>Status</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: theme.colors.text.secondary,
                    borderBottom: `1px solid ${theme.colors.border.main}`
                  }}>Issue Date</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: theme.colors.text.secondary,
                    borderBottom: `1px solid ${theme.colors.border.main}`
                  }}>Due Date</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: theme.colors.text.secondary,
                    borderBottom: `1px solid ${theme.colors.border.main}`
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const statusDisplay = getStatusDisplay(invoice.status)
                  const dueDate = new Date(invoice.date)
                  dueDate.setDate(dueDate.getDate() + 30) // Add 30 days to issue date
                  
                  return (
                    <tr key={invoice.id} style={{ borderBottom: `1px solid ${theme.colors.border.main}` }}>
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: theme.colors.text.primary, marginBottom: '4px' }}>
                            #{invoice.invoice_number}
                          </div>
                          <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
                            Website Development - Phase 1
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                          ${invoice.total_amount.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          backgroundColor: statusDisplay.colors.bg, 
                          color: statusDisplay.colors.text
                        }}>
                          {statusDisplay.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: theme.colors.text.secondary }}>
                        {formatDate(invoice.date)}
                      </td>
                      <td style={{ padding: '16px', color: theme.colors.text.secondary }}>
                        {formatDate(dueDate.toISOString())}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleInvoiceClick(invoice)}
                            style={{
                              padding: '8px',
                              backgroundColor: theme.colors.secondary.bg,
                              color: theme.colors.secondary.main,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="View Invoice"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => window.open(`http://localhost:8000/invoices/${invoice.id}/pdf`, '_blank')}
                            style={{
                              padding: '8px',
                              backgroundColor: theme.colors.primary.bg,
                              color: theme.colors.primary.main,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            style={{
                              padding: '8px',
                              backgroundColor: theme.colors.gray[100],
                              color: theme.colors.text.secondary,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="More Actions"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Board View */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {/* Draft Column */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'draft')}
              style={{
                backgroundColor: theme.colors.background.card,
                borderRadius: '12px',
                border: draggedInvoice && ['draft'].includes(draggedInvoice.status || 'draft') ? `2px dashed ${theme.colors.border.main}` : `1px solid ${theme.colors.border.main}`,
                minHeight: '300px'
              }}
            >
              <div style={{ 
                padding: '16px 20px',
                borderBottom: `1px solid ${theme.colors.border.main}`,
                backgroundColor: theme.status.draft.bg,
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: theme.status.draft.text, margin: 0 }}>
                  📝 Draft ({invoices.filter(i => (i.status || 'draft') === 'draft').length})
                </h3>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoices.filter(invoice => (invoice.status || 'draft') === 'draft').map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} statusColor={theme.status.draft.text} />
                ))}
              </div>
            </div>

            {/* Pending Column */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'pending')}
              style={{
                backgroundColor: theme.colors.background.card,
                borderRadius: '12px',
                border: draggedInvoice && ['pending', 'submitted', 'sent'].includes(draggedInvoice.status || 'draft') ? `2px dashed ${theme.colors.border.main}` : `1px solid ${theme.colors.border.main}`,
                minHeight: '300px'
              }}
            >
              <div style={{ 
                padding: '16px 20px',
                borderBottom: `1px solid ${theme.colors.border.main}`,
                backgroundColor: theme.status.pending.bg,
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: theme.status.pending.text, margin: 0 }}>
                  ⏳ Pending ({invoices.filter(i => {
                    const status = i.status || 'draft'
                    return ['pending', 'submitted', 'sent'].includes(status)
                  }).length})
                </h3>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoices.filter(invoice => {
                  const status = invoice.status || 'draft'
                  return ['pending', 'submitted', 'sent'].includes(status)
                }).map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} statusColor={theme.status.pending.text} />
                ))}
              </div>
            </div>

            {/* Paid Column */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'paid')}
              style={{
                backgroundColor: theme.colors.background.card,
                borderRadius: '12px',
                border: draggedInvoice && ['paid'].includes(draggedInvoice.status || 'draft') ? `2px dashed ${theme.colors.border.main}` : `1px solid ${theme.colors.border.main}`,
                minHeight: '300px'
              }}
            >
              <div style={{ 
                padding: '16px 20px',
                borderBottom: `1px solid ${theme.colors.border.main}`,
                backgroundColor: theme.status.paid.bg,
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: theme.status.paid.text, margin: 0 }}>
                  ✅ Paid ({invoices.filter(i => (i.status || 'draft') === 'paid').length})
                </h3>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoices.filter(invoice => (invoice.status || 'draft') === 'paid').map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} statusColor={theme.status.paid.text} />
                ))}
              </div>
            </div>

            {/* Overdue Column */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'overdue')}
              style={{
                backgroundColor: theme.colors.background.card,
                borderRadius: '12px',
                border: draggedInvoice && ['overdue'].includes(draggedInvoice.status || 'draft') ? `2px dashed ${theme.colors.border.main}` : `1px solid ${theme.colors.border.main}`,
                minHeight: '300px'
              }}
            >
              <div style={{ 
                padding: '16px 20px',
                borderBottom: `1px solid ${theme.colors.border.main}`,
                backgroundColor: theme.status.overdue.bg,
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: theme.status.overdue.text, margin: 0 }}>
                  🚨 Overdue ({invoices.filter(i => (i.status || 'draft') === 'overdue').length})
                </h3>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoices.filter(invoice => (invoice.status || 'draft') === 'overdue').map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} statusColor={theme.status.overdue.text} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}