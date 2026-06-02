import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsService, GetPatientsParams } from '../services/patients.service';
import { Patient, Sex } from '../types';
import { Table, Column } from '../components/Table';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Pagination } from '../components/Pagination';
import { PageListLayout } from '../components/templates';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { formatDate } from '../utils/dateUtils';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sexFilter, setSexFilter] = useState<Sex | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 10;

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetPatientsParams = {
        page: currentPage,
        limit,
        search: activeSearch || undefined,
        sex: sexFilter || undefined,
      };

      const response = await patientsService.getPatients(params);
      setPatients(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar pacientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [currentPage, sexFilter, activeSearch]);

  const handleSearch = () => {
    setActiveSearch(search);
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveSearch('');
    setSexFilter('');
    setCurrentPage(1);
  };

  const columns: Column<Patient>[] = [
    { key: 'dni', header: 'DNI' },
    { key: 'firstName', header: 'Nombres' },
    { key: 'lastName', header: 'Apellidos' },
    {
      key: 'sex',
      header: 'Sexo',
      render: (patient) => ({ M: 'Masculino', F: 'Femenino', Other: 'Otro' }[patient.sex]),
    },
    { key: 'phone', header: 'Teléfono', render: (p) => p.phone || '-' },
    { key: 'dateOfBirth', header: 'Fecha de Nacimiento', render: (p) => formatDate(p.dateOfBirth) },
    {
      key: 'lastAttendedDate',
      header: 'Última Atención',
      render: (p) => p.lastAttendedDate ? formatDate(p.lastAttendedDate) : '-',
    },
    {
      key: 'lastAttendedBy',
      header: 'Atendido por',
      render: (p) =>
        p.lastAttendedBy ? (
          <span
            style={{ color: 'var(--color-success)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/employees/${p.lastAttendedBy!.id}`); }}
          >
            {p.lastAttendedBy.firstName} {p.lastAttendedBy.lastName}
          </span>
        ) : '-',
    },
    {
      key: 'createdBy',
      header: 'Registrado por',
      render: (p) =>
        p.createdBy ? (
          <span
            style={{ color: 'var(--color-info)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/employees/${p.createdBy!.id}`); }}
          >
            {p.createdBy.firstName} {p.createdBy.lastName}
          </span>
        ) : '-',
    },
    { key: 'createdAt', header: 'Fecha de Registro', render: (p) => formatDate(p.createdAt) },
  ];

  return (
    <PageListLayout
      title="Gestión de Pacientes"
      actions={
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Nuevo Paciente
        </Button>
      }
      filters={
        <>
          <Input
            type="text"
            placeholder="Buscar por nombre, DNI, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="search-input"
          />
          <Select
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value as Sex | '')}
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
              { value: 'Other', label: 'Otro' },
            ]}
            className="filter-select"
          />
          <Button variant="primary" onClick={handleSearch}>
            Buscar
          </Button>
          {(search || activeSearch || sexFilter) && (
            <Button variant="secondary" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </>
      }
      total={total}
      totalLabel="pacientes"
      isLoading={isLoading}
      loadingText="Cargando pacientes..."
      error={error}
    >
      <Table
        columns={columns}
        data={patients}
        onRowClick={(p) => navigate(`/patients/${p.id}`)}
        emptyMessage="No se encontraron pacientes"
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      <CreatePatientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(patient) => {
          setPatients(prev => [patient, ...prev]);
          setTotal(prev => prev + 1);
          setShowCreateModal(false);
        }}
      />
    </PageListLayout>
  );
};
