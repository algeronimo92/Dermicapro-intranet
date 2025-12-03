import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsService, GetPatientsParams } from '../services/patients.service';
import { Patient, Sex } from '../types';
import { Table, Column } from '../components/Table';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y paginación
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState(''); // Búsqueda activa aplicada
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
        sex: sexFilter || undefined
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
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveSearch('');
    setSexFilter('');
    setCurrentPage(1);
  };

  const handleCreatePatient = () => {
    navigate('/patients/new');
  };

  const handleRowClick = (patient: Patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const columns: Column<Patient>[] = [
    {
      key: 'dni',
      header: 'DNI',
    },
    {
      key: 'firstName',
      header: 'Nombres',
    },
    {
      key: 'lastName',
      header: 'Apellidos',
    },
    {
      key: 'sex',
      header: 'Sexo',
      render: (patient) => {
        const sexLabels: Record<Sex, string> = {
          M: 'Masculino',
          F: 'Femenino',
          Other: 'Otro'
        };
        return sexLabels[patient.sex];
      }
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (patient) => patient.phone || '-'
    },
    {
      key: 'email',
      header: 'Correo',
      render: (patient) => patient.email || '-'
    },
    {
      key: 'dateOfBirth',
      header: 'Fecha de Nacimiento',
      render: (patient) => new Date(patient.dateOfBirth).toLocaleDateString('es-PE')
    },
    {
      key: 'createdBy',
      header: 'Registrado por',
      render: (patient) => patient.createdBy ? (
        <span
          style={{
            color: '#3498db',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Navigate to user profile when page exists
            alert(`Perfil de usuario: ${patient.createdBy.firstName} ${patient.createdBy.lastName}\n(Página de perfil próximamente)`);
          }}
        >
          {patient.createdBy.firstName} {patient.createdBy.lastName}
        </span>
      ) : '-'
    },
    {
      key: 'createdAt',
      header: 'Fecha de Registro',
      render: (patient) => new Date(patient.createdAt).toLocaleDateString('es-PE')
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Pacientes</h1>
        <Button variant="primary" onClick={handleCreatePatient}>
          + Nuevo Paciente
        </Button>
      </div>

      <div className="filters-container">
        <div className="filters-row">
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
              { value: 'Other', label: 'Otro' }
            ]}
            className="filter-select"
          />

          <Button variant="primary" onClick={handleSearch}>
            Buscar
          </Button>

          {(search || activeSearch || sexFilter) && (
            <Button
              variant="secondary"
              onClick={handleClearFilters}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="results-info">
        <p>Total de pacientes: {total}</p>
      </div>

      {isLoading ? (
        <Loading text="Cargando pacientes..." />
      ) : (
        <>
          <Table
            columns={columns}
            data={patients}
            onRowClick={handleRowClick}
            emptyMessage="No se encontraron pacientes"
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};
