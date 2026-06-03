import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { Patient } from '../types';

export const PatientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleClose = () => navigate(id ? `/patients/${id}` : '/patients');
  const handleSaved = (patient: Patient) => navigate(`/patients/${patient.id}`);

  return (
    <CreatePatientModal
      isOpen={true}
      onClose={handleClose}
      onCreated={handleSaved}
      onUpdated={handleSaved}
      patientId={id}
    />
  );
};
