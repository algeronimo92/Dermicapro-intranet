import api from './api';
import { CreditTransaction, PaymentMethod } from '../types';

export interface AddCreditDto {
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CreditHistoryResponse {
  accountBalance: number;
  credits: CreditTransaction[];
}

export const creditsService = {
  async addCredit(patientId: string, data: AddCreditDto): Promise<{ paymentId: string; accountBalance: number }> {
    const res = await api.post<{ payment: { id: string }; accountBalance: number }>(
      `/patients/${patientId}/add-credit`,
      data
    );
    return { paymentId: res.data.payment.id, accountBalance: Number(res.data.accountBalance) };
  },

  async getCreditHistory(patientId: string): Promise<CreditHistoryResponse> {
    const res = await api.get<CreditHistoryResponse>(`/patients/${patientId}/credit-history`);
    return {
      accountBalance: Number(res.data.accountBalance),
      credits: res.data.credits,
    };
  },
};
