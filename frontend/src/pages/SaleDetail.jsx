import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function SaleDetail() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [error, setError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  function load() {
    api.getVehicleSale(id).then(setSale).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, [id]);

  async function handleRecordPayment() {
    try {
      await api.recordSalePayment(id, Number(paymentAmount));
      setPaymentAmount('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!sale) return <p>Loading…</p>;

  const balanceDue = sale.totalAmount - sale.amountPaid;

  return (
    <div className="invoice-detail">
      <div className="invoice-actions no-print">
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <div className="invoice-paper">
        <h1>Invoice {sale.invoiceNumber}</h1>
        <p>Date: {new Date(sale.saleDate).toLocaleString()}</p>
        <p>Vehicle: {sale.vehicle?.vehicleNumber}</p>
        <p>Shop: {sale.shop?.name}</p>
        {sale.shop?.phone && <p>Phone: {sale.shop.phone}</p>}

        <table className="data-table">
          <thead>
            <tr><th>Item</th><th>Qty (units)</th><th>Unit Price</th><th>Tax %</th><th>Line Total</th></tr>
          </thead>
          <tbody>
            {sale.items.map(item => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.quantityUnits}</td>
                <td>₹{item.unitPrice.toFixed(2)}</td>
                <td>{item.taxPercent}%</td>
                <td>₹{item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div><span>Subtotal</span><span>₹{sale.subTotal.toFixed(2)}</span></div>
          <div><span>Tax</span><span>₹{sale.taxAmount.toFixed(2)}</span></div>
          <div><span>Discount</span><span>₹{sale.discountAmount.toFixed(2)}</span></div>
          <div className="totals-final"><span>Total</span><span>₹{sale.totalAmount.toFixed(2)}</span></div>
          <div><span>Paid</span><span>₹{sale.amountPaid.toFixed(2)}</span></div>
          <div><span>Balance Due</span><span>₹{balanceDue.toFixed(2)}</span></div>
        </div>

        <p>Payment Method: {sale.paymentMethod} &nbsp;|&nbsp; Status: <span className={`badge badge-${sale.paymentStatus.toLowerCase()}`}>{sale.paymentStatus}</span></p>
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
