/**
 * 页面辅助 Hook：读取当前路由患者的便捷封装。
 */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePatientStore } from '../store/PatientContext';
import type { Patient } from '../types/patient';

export function usePatient(): { patient?: Patient; loading: boolean } {
  const { id } = useParams<{ id: string }>();
  const { state } = usePatientStore();
  const patient = useMemo(
    () => (id ? state.patients.find((p) => p.id === id) : undefined),
    [state.patients, id],
  );
  return { patient, loading: false };
}
