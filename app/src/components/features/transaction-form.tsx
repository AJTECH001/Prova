import { useState, type FormEvent } from 'react';
import type { CreateTransactionRequest } from '@/services/TransactionService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TransactionFormProps {
  onSubmit: (data: CreateTransactionRequest) => void;
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const ETH_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [buyerAddress, setBuyerAddress] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const minDate = getTomorrowDate();

  const buyerAddressValid = buyerAddress === '' || ETH_ADDRESS_REGEX.test(buyerAddress);
  const canSubmit = !!amount && buyerAddress !== '' && ETH_ADDRESS_REGEX.test(buyerAddress);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      onSubmit({
        counterparty: buyerAddress,
        external_reference: externalReference || undefined,
        amount: parseFloat(amount),
        deadline: deadline || undefined,
        type: 'escrow',
        currency: { type: 'crypto', code: 'USDC' },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {/* Buyer wallet address — required for on-chain condition resolver */}
      <Input
        label="Buyer Wallet Address *"
        placeholder="0x..."
        value={buyerAddress}
        onChange={(e) => setBuyerAddress(e.target.value)}
        error={!buyerAddressValid ? 'Must be a valid 0x wallet address' : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount (USDC) *"
          placeholder="0.00"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Due Date"
          type="date"
          min={minDate}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <Input
        label="Invoice Reference"
        placeholder="INV-001"
        value={externalReference}
        onChange={(e) => setExternalReference(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={!canSubmit}>
          Create Invoice Escrow
        </Button>
      </div>
    </form>
  );
}
