import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { Badge, EmptyState, ErrorNote, Loading, Modal, PageHeader, Segmented, statusTone } from '../components/ui';
import { fmtDateTime, inr } from '../utils/format';

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(null); // open trips, when choosing where to sell

  function load() {
    setError('');
    api.getVehicleSales(status ? { status } : {}).then(setSales).catch(err => { setError(err.message); setSales([]); });
  }
  useEffect(load, [status]);

  // "New sale" always starts from an open trip, because stock is sold off a vehicle.
  async function newSale() {
    try {
      const open = await api.getTrips({ status: 'Open' });
      if (open.length === 1) navigate(`/trips/${open[0].id}`);
      else setPicker(open);
    } catch (err) {
      setError(err.message);
    }
  }

  const total = (sales || []).reduce((s, x) => s + x.totalAmount, 0);

  return (
    <div>
      <PageHeader title="Sales" subtitle="Every invoice raised from a vehicle trip.">
        <button className="btn btn-primary" onClick={newSale}><Icon name="plus" /> New sale</button>
      </PageHeader>
      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <div className="toolbar">
        <Segmented
          label="Filter by payment"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'Paid', label: 'Paid' },
            { value: 'Partial', label: 'Part paid' },
            { value: 'Unpaid', label: 'On credit' },
          ]}
        />
        {sales && sales.length > 0 && <span className="muted num">{sales.length} invoices · {inr(total)}</span>}
      </div>

      <div className="card card-flush">
        {sales === null ? <Loading /> : sales.length === 0 ? (
          <EmptyState icon="receipt" title={status ? 'No invoices match this filter' : 'No sales yet'}
            action={!status && <button className="btn btn-primary" onClick={newSale}>Make the first sale</button>}>
            {status ? 'Try a different payment filter.' : 'Sales are made from a vehicle that is out on a trip.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Invoice</th><th>When</th><th>Shop</th><th>Vehicle</th><th className="right">Total</th><th>Payment</th></tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td data-label="Invoice"><Link className="cell-title" to={`/sales/${s.id}`}>{s.invoiceNumber}</Link></td>
                    <td data-label="When">{fmtDateTime(s.saleDate)}</td>
                    <td data-label="Shop">{s.shop?.name}</td>
                    <td data-label="Vehicle">{s.vehicle?.vehicleNumber}</td>
                    <td data-label="Total" className="num right strong">{inr(s.totalAmount)}</td>
                    <td data-label="Payment">
                      <Badge tone={statusTone(s.paymentStatus)}>
                        {s.paymentStatus === 'Unpaid' ? 'On credit' : s.paymentStatus === 'Partial' ? 'Part paid' : 'Paid'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {picker && (
        <Modal title="Which vehicle is selling?" size="sm" onClose={() => setPicker(null)}>
          {picker.length === 0 ? (
            <EmptyState icon="truck" title="No vehicle is out right now"
              action={<Link className="btn btn-primary" to="/trips">Start a trip</Link>}>
              Start a trip and load stock first. Then you can bill shops from that vehicle.
            </EmptyState>
          ) : (
            <div className="out-list">
              {picker.map(t => (
                <Link key={t.id} to={`/trips/${t.id}`} className="out-item">
                  <span className="badge-ico"><Icon name="truck" /></span>
                  <span className="grow">
                    <span className="cell-title">{t.vehicle?.vehicleNumber}</span>
                    <span className="cell-sub" style={{ display: 'block' }}>{t.tripNumber}</span>
                  </span>
                  <Icon name="arrowRight" />
                </Link>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
