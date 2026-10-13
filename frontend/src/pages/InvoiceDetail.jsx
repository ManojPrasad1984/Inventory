import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  function load() {
    api.getInvoice(id).then(setInvoice).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, [id]);

  async function handleRecordPayment() {
    try {
      await api.recordPayment(id, Number(paymentAmount));
      setPaymentAmount('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!invoice) return <p>Loading…</p>;

  const balanceDue = invoice.totalAmount - invoice.amountPaid;

  return (
    <div className="invoice-detail">
      <div className="invoice-actions no-print">
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <div className="invoice-paper">
        <h1>Invoice {invoice.invoiceNumber}</h1>
        <p>Date: {new Date(invoice.invoiceDate).toLocaleString()}</p>
        <p>Bill to: {invoice.customer?.name || invoice.walkInCustomerName || 'Walk-in Customer'}</p>
        {invoice.customer?.phone && <p>Phone: {invoice.customer.phone}</p>}

        <table className="data-table">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Line Total</th></tr>
          </thead>
          <tbody>
            {invoice.items.map(item => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>₹{item.unitPrice.toFixed(2)}</td>
                <td>{item.taxPercent}%</td>
                <td>₹{item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div><span>Subtotal</span><span>₹{invoice.subTotal.toFixed(2)}</span></div>
          <div><span>Tax</span><span>₹{invoice.taxAmount.toFixed(2)}</span></div>
          <div><span>Discount</span><span>₹{invoice.discountAmount.toFixed(2)}</span></div>
          <div className="totals-final"><span>Total</span><span>₹{invoice.totalAmount.toFixed(2)}</span></div>
          <div><span>Paid</span><span>₹{invoice.amountPaid.toFixed(2)}</span></div>
          <div><span>Balance Due</span><span>₹{balanceDue.toFixed(2)}</span></div>
        </div>

        <p>Payment Method: {invoice.paymentMethod} &nbsp;|&nbsp; Status: <span className={`badge badge-${invoice.paymentStatus.toLowerCase()}`}>{invoice.paymentStatus}</span></p>
      </div>

      {balanceDue > 0 && (
        <div className="no-print">
          <h3>Record Additional Payment</h3>
          <input type="number" step="0.01" placeholder="Amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
          <button onClick={handleRecordPayment}>Record Payment</button>
        </div>
      )}
    </div>
  );
}
