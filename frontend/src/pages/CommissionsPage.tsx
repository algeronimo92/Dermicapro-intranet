import { useState, useEffect } from 'react';
import { Role } from '../types';
import { DatePicker } from '../components/DatePicker';
import commissionsService, { Commission, CommissionsFilters } from '../services/commissions.service';
import { usersService } from '../services/users.service';
import '../styles/commissions-page.css';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Pagination } from '../components/Pagination';
import { Select } from '../components/Select';
import { IconButton } from '../components/ui/IconButton';
import { Check, X, Banknote } from 'lucide-react';

const CommissionsPage = () => {
  
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Datos auxiliares
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    loadSalesPersons();
  }, []);

  useEffect(() => {
    loadCommissions();
  }, [page, limit, statusFilter, salesPersonFilter, startDate, endDate]);

  const loadSalesPersons = async () => {
    try {
      const users = await usersService.getAllUsers({ roleName: Role.sales });
      setSalesPersons(users);
    } catch (err) {
      console.error('Error loading sales persons:', err);
    }
  };

  const loadCommissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: CommissionsFilters = {
        page,
        limit,
      };

      if (statusFilter) filters.status = statusFilter;
      if (salesPersonFilter) filters.salesPersonId = salesPersonFilter;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const response = await commissionsService.getAllCommissions(filters);
      setCommissions(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.total || 0);
      setSummary(response.summary || null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar comisiones');
      setCommissions([]);
      setTotalPages(1);
      setTotal(0);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCommission = (id: string) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommissions(newSelected);
  };

  const handleSelectAll = () => {
    if (!commissions || commissions.length === 0) return;
    if (selectedCommissions.size === commissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(commissions.map(c => c.id)));
    }
  };

  const handleApprove = async (commission: Commission) => {
    setSelectedCommission(commission);
    setActionNotes('');
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedCommission) return;

    try {
      await commissionsService.approveCommission(selectedCommission.id, actionNotes);
      setShowApproveModal(false);
      loadCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al aprobar comisión');
    }
  };

  const handleBatchApprove = async () => {
    if (selectedCommissions.size === 0) {
      alert('Selecciona al menos una comisión');
      return;
    }

    if (!confirm(`¿Aprobar ${selectedCommissions.size} comisiones?`)) return;

    try {
      await commissionsService.batchApprove(Array.from(selectedCommissions));
      setSelectedCommissions(new Set());
      loadCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al aprobar comisiones');
    }
  };

  const handlePay = async (commission: Commission) => {
    setSelectedCommission(commission);
    setActionNotes('');
    setPaymentMethod('cash');
    setPaymentReference('');
    setShowPayModal(true);
  };

  const confirmPay = async () => {
    if (!selectedCommission) return;

    try {
      await commissionsService.markAsPaid(
        selectedCommission.id,
        paymentMethod,
        paymentReference,
        actionNotes
      );
      setShowPayModal(false);
      loadCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al marcar como pagada');
    }
  };

  const handleBatchPay = async () => {
    if (selectedCommissions.size === 0) {
      alert('Selecciona al menos una comisión');
      return;
    }

    const method = prompt('Método de pago (cash, card, transfer, yape, plin):', 'cash');
    if (!method) return;

    const reference = prompt('Referencia de pago (opcional):');

    try {
      await commissionsService.batchMarkAsPaid(
        Array.from(selectedCommissions),
        method,
        reference || undefined
      );
      setSelectedCommissions(new Set());
      loadCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al marcar comisiones como pagadas');
    }
  };

  const handleReject = async (commission: Commission) => {
    setSelectedCommission(commission);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedCommission || !rejectionReason.trim()) {
      alert('El motivo de rechazo es obligatorio');
      return;
    }

    try {
      await commissionsService.rejectCommission(selectedCommission.id, rejectionReason);
      setShowRejectModal(false);
      loadCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al rechazar comisión');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'approved':
        return 'badge-info';
      case 'paid':
        return 'badge-success';
      case 'cancelled':
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'paid':
        return 'Pagada';
      case 'cancelled':
        return 'Cancelada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && commissions.length === 0) return <TableSkeleton rows={8} columns={7} />;

  return (
    <div className="commissions-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Comisiones</h1>
          <p className="subtitle">Administra las comisiones de los vendedores</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && summary.totals && summary.totals.length > 0 && (
        <div className="summary-cards">
          {summary.totals.map((item: any) => (
            <div key={item.status} className={`summary-card summary-card--${item.status}`}>
              <div className="summary-label">{getStatusText(item.status)}</div>
              <div className="summary-value">{formatCurrency(item.amount)}</div>
              <div className="summary-count">{item.count} comisiones</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filters-container">
        <div className="filters-row">

          <div className="filter-group">
            <label className="field-label">Estado</label>
            <Select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'Todos' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'approved', label: 'Aprobada' },
                { value: 'paid', label: 'Pagada' },
                { value: 'rejected', label: 'Rechazada' },
                { value: 'cancelled', label: 'Cancelada' },
              ]}
            />
          </div>

          <div className="filter-group">
            <label className="field-label">Vendedor</label>
            <Select
              aria-label="Filtrar por vendedor"
              value={salesPersonFilter}
              onChange={(e) => { setSalesPersonFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'Todos' },
                ...(salesPersons ?? []).map((person) => ({ value: person.id, label: `${person.firstName} ${person.lastName}` })),
              ]}
            />
          </div>

          <div className="filter-group">
            <label className="field-label">Desde</label>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              maxDate={new Date()}
              placeholder="Fecha inicio"
            />
          </div>

          <div className="filter-group">
            <label className="field-label">Hasta</label>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              maxDate={new Date()}
              minDate={startDate ? new Date(startDate + 'T12:00:00') : undefined}
              placeholder="Fecha fin"
            />
          </div>

          <button
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => {
              setStatusFilter('');
              setSalesPersonFilter('');
              setStartDate('');
              setEndDate('');
            }}
          >
            Limpiar filtros
          </button>

        </div>
      </div>

      {/* Batch Actions */}
      {selectedCommissions.size > 0 && (
        <div className="batch-actions">
          <span>{selectedCommissions.size} seleccionadas</span>
          <button className="btn btn-primary btn-sm" onClick={handleBatchApprove}>
            Aprobar seleccionadas
          </button>
          <button className="btn btn-success btn-sm" onClick={handleBatchPay}>
            Marcar como pagadas
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCommissions(new Set())}>
            Limpiar selección
          </button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Commissions Table */}
      <div className="table-container">
        <table className="commissions-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedCommissions.size === commissions.length && commissions.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Vendedor</th>
              <th>Servicio</th>
              <th>Paciente</th>
              <th>Fecha Cita</th>
              <th>Estado Cita</th>
              <th>Base</th>
              <th>Tasa</th>
              <th>Comisión</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {commissions && commissions.length > 0 ? commissions.map((commission) => (
              <tr key={commission.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedCommissions.has(commission.id)}
                    onChange={() => handleSelectCommission(commission.id)}
                  />
                </td>
                <td>
                  {commission.salesPerson?.firstName} {commission.salesPerson?.lastName}
                </td>
                <td>{commission.service?.name || '-'}</td>
                <td>
                  {commission.appointment?.patient.firstName}{' '}
                  {commission.appointment?.patient.lastName}
                </td>
                <td>{formatDate(commission.appointment?.scheduledDate || commission.createdAt)}</td>
                <td>
                  <span className={`badge ${commission.appointment?.status === 'attended' ? 'badge-success' : 'badge-warning'}`}>
                    {commission.appointment?.status === 'attended' ? 'Atendida' : commission.appointment?.status || 'N/A'}
                  </span>
                </td>
                <td>{formatCurrency(commission.baseAmount)}</td>
                <td>{(commission.commissionRate * 100).toFixed(1)}%</td>
                <td className="amount">{formatCurrency(commission.commissionAmount)}</td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(commission.status)}`}>
                    {getStatusText(commission.status)}
                  </span>
                </td>
                <td className="actions">
                  <span className="icon-btn-group">
                    {commission.status === 'pending' && (
                      <>
                        <IconButton
                          tone="success"
                          icon={<Check size={16} strokeWidth={2.5} />}
                          label="Aprobar comisión"
                          onClick={() => handleApprove(commission)}
                          disabled={commission.appointment?.status !== 'attended'}
                          disabledReason="Se puede aprobar cuando la cita esté atendida"
                        />
                        <IconButton
                          tone="danger"
                          icon={<X size={16} strokeWidth={2.5} />}
                          label="Rechazar comisión"
                          onClick={() => handleReject(commission)}
                        />
                      </>
                    )}
                    {commission.status === 'approved' && (
                      <IconButton
                        tone="primary"
                        icon={<Banknote size={16} strokeWidth={2} />}
                        label="Marcar como pagada"
                        onClick={() => handlePay(commission)}
                      />
                    )}
                  </span>
                  {commission.status === 'paid' && commission.paidAt && (
                    <small className="text-muted">
                      Pagada: {formatDate(commission.paidAt)}
                    </small>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }}>
                  {loading ? 'Cargando...' : 'No hay comisiones para mostrar'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={total}
        pageSize={limit}
        onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
        itemLabel="comisiones"
      />

      {/* Approve Modal */}
      {showApproveModal && selectedCommission && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Aprobar Comisión</h3>
            <p>
              <strong>Vendedor:</strong> {selectedCommission.salesPerson?.firstName}{' '}
              {selectedCommission.salesPerson?.lastName}
            </p>
            <p>
              <strong>Monto:</strong> {formatCurrency(selectedCommission.commissionAmount)}
            </p>
            {selectedCommission.appointment && (
              <p>
                <strong>Estado de Cita:</strong>{' '}
                <span className={`badge ${selectedCommission.appointment.status === 'attended' ? 'badge-success' : 'badge-warning'}`}>
                  {selectedCommission.appointment.status === 'attended' ? 'Atendida' : selectedCommission.appointment.status}
                </span>
              </p>
            )}
            {selectedCommission.appointment?.status !== 'attended' && (
              <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '12px', margin: '16px 0' }}>
                <strong style={{ color: '#856404' }}>⚠️ Advertencia:</strong>
                <p style={{ margin: '8px 0 0 0', color: '#856404' }}>
                  La cita asociada a esta comisión no ha sido marcada como "Atendida".
                  No podrás aprobar esta comisión hasta que el paciente asista a la cita.
                </p>
              </div>
            )}
            <div className="form-group">
              <label>Notas (opcional):</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={confirmApprove}
                disabled={selectedCommission.appointment?.status !== 'attended'}
              >
                Confirmar Aprobación
              </button>
              <button className="btn-secondary" onClick={() => setShowApproveModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedCommission && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Marcar como Pagada</h3>
            <p>
              <strong>Vendedor:</strong> {selectedCommission.salesPerson?.firstName}{' '}
              {selectedCommission.salesPerson?.lastName}
            </p>
            <p>
              <strong>Monto:</strong> {formatCurrency(selectedCommission.commissionAmount)}
            </p>
            <div className="form-group">
              <label>Método de pago:</label>
              <Select
                aria-label="Método de pago"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'cash', label: 'Efectivo' },
                  { value: 'card', label: 'Tarjeta' },
                  { value: 'transfer', label: 'Transferencia' },
                  { value: 'yape', label: 'Yape' },
                  { value: 'plin', label: 'Plin' },
                ]}
              />
            </div>
            <div className="form-group">
              <label>Referencia (opcional):</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Número de operación, etc."
              />
            </div>
            <div className="form-group">
              <label>Notas (opcional):</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-success" onClick={confirmPay}>
                Confirmar Pago
              </button>
              <button className="btn-secondary" onClick={() => setShowPayModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedCommission && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rechazar Comisión</h3>
            <p>
              <strong>Vendedor:</strong> {selectedCommission.salesPerson?.firstName}{' '}
              {selectedCommission.salesPerson?.lastName}
            </p>
            <p>
              <strong>Monto:</strong> {formatCurrency(selectedCommission.commissionAmount)}
            </p>
            <div className="form-group">
              <label>Motivo de rechazo *:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explica por qué se rechaza esta comisión..."
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn-danger" onClick={confirmReject}>
                Confirmar Rechazo
              </button>
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsPage;
