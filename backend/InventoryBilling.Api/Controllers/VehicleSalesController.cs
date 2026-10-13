using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryBilling.Api.Data;
using InventoryBilling.Api.DTOs;
using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.Controllers;

/// <summary>Workflow step 4: retail sale from an out-on-round vehicle to a shop, any payment type, credit tracked.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehicleSalesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VehicleSalesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VehicleSale>>> GetAll(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] SalePaymentStatus? status, [FromQuery] int? tripId)
    {
        var query = _db.VehicleSales.Include(s => s.Shop).Include(s => s.Vehicle).AsQueryable();

        if (from.HasValue) query = query.Where(s => s.SaleDate >= from.Value);
        if (to.HasValue) query = query.Where(s => s.SaleDate <= to.Value);
        if (status.HasValue) query = query.Where(s => s.PaymentStatus == status.Value);
        if (tripId.HasValue) query = query.Where(s => s.TripId == tripId.Value);

        return Ok(await query.OrderByDescending(s => s.SaleDate).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VehicleSale>> GetById(int id)
    {
        var sale = await _db.VehicleSales
            .Include(s => s.Items)
            .Include(s => s.Shop)
            .Include(s => s.Vehicle)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sale is null) return NotFound();
        return Ok(sale);
    }

    [HttpPost]
    public async Task<ActionResult<VehicleSale>> Create(VehicleSaleCreateRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest("A sale needs at least one line item.");

        var trip = await _db.Trips.FindAsync(request.TripId);
        if (trip is null) return BadRequest("Trip not found.");
        if (trip.Status != TripStatus.Open) return BadRequest("This trip is closed - open a new trip for this vehicle first.");

        var shop = await _db.Shops.FindAsync(request.ShopId);
        if (shop is null) return BadRequest("Shop not found.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var sale = new VehicleSale
            {
                InvoiceNumber = await GenerateInvoiceNumberAsync(),
                TripId = trip.Id,
                VehicleId = trip.VehicleId,
                ShopId = shop.Id,
                DiscountAmount = request.DiscountAmount,
                PaymentMethod = request.PaymentMethod,
                Notes = request.Notes
            };

            decimal subTotal = 0;
            decimal taxTotal = 0;

            foreach (var line in request.Items)
            {
                var product = await _db.Products.FindAsync(line.ProductId);
                if (product is null) return BadRequest($"Product {line.ProductId} not found.");
                if (line.QuantityUnits <= 0) return BadRequest($"Quantity for '{product.Name}' must be greater than zero.");

                var vehicleStock = await _db.VehicleStocks
                    .FirstOrDefaultAsync(vs => vs.VehicleId == trip.VehicleId && vs.ProductId == product.Id);
                var available = vehicleStock?.QuantityUnits ?? 0;
                if (available < line.QuantityUnits)
                    return BadRequest($"Insufficient stock on this vehicle for '{product.Name}'. On board: {available}, requested: {line.QuantityUnits}.");

                var unitPrice = product.SellingPricePerUnit;
                var lineSubTotal = unitPrice * line.QuantityUnits;
                var lineTax = lineSubTotal * (product.TaxPercent / 100m);

                sale.Items.Add(new VehicleSaleItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    QuantityUnits = line.QuantityUnits,
                    UnitPrice = unitPrice,
                    TaxPercent = product.TaxPercent,
                    LineTotal = lineSubTotal + lineTax
                });

                subTotal += lineSubTotal;
                taxTotal += lineTax;

                vehicleStock!.QuantityUnits -= line.QuantityUnits;
            }

            sale.SubTotal = subTotal;
            sale.TaxAmount = taxTotal;
            sale.TotalAmount = subTotal + taxTotal - request.DiscountAmount;
            sale.AmountPaid = request.AmountPaid;

            sale.PaymentStatus =
                request.AmountPaid >= sale.TotalAmount ? SalePaymentStatus.Paid :
                request.AmountPaid <= 0 ? SalePaymentStatus.Unpaid :
                SalePaymentStatus.Partial;

            _db.VehicleSales.Add(sale);
            await _db.SaveChangesAsync(); // need sale.Id for the ledger entry below

            // Every sale posts to the shop's ledger: a debit for the invoice, a credit for whatever was paid now.
            shop.OutstandingBalance += sale.TotalAmount - sale.AmountPaid;

            _db.ShopLedgerEntries.Add(new ShopLedgerEntry
            {
                ShopId = shop.Id,
                VehicleSaleId = sale.Id,
                Type = LedgerEntryType.Sale,
                Debit = sale.TotalAmount,
                Credit = sale.AmountPaid,
                RunningBalance = shop.OutstandingBalance,
                Notes = $"Invoice {sale.InvoiceNumber}"
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = sale.Id }, sale);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // Record a later payment against a specific partially-paid/unpaid sale (as opposed to a general shop payment).
    [HttpPost("{id}/record-payment")]
    public async Task<IActionResult> RecordPayment(int id, [FromBody] decimal amount)
    {
        if (amount <= 0) return BadRequest("Payment amount must be positive.");

        var sale = await _db.VehicleSales.FindAsync(id);
        if (sale is null) return NotFound();

        var shop = await _db.Shops.FindAsync(sale.ShopId);
        if (shop is null) return NotFound("Shop not found for this sale.");

        sale.AmountPaid += amount;
        if (sale.AmountPaid >= sale.TotalAmount)
        {
            sale.AmountPaid = sale.TotalAmount;
            sale.PaymentStatus = SalePaymentStatus.Paid;
        }
        else
        {
            sale.PaymentStatus = SalePaymentStatus.Partial;
        }

        shop.OutstandingBalance -= amount;

        _db.ShopLedgerEntries.Add(new ShopLedgerEntry
        {
            ShopId = shop.Id,
            VehicleSaleId = sale.Id,
            Type = LedgerEntryType.Payment,
            Credit = amount,
            RunningBalance = shop.OutstandingBalance,
            Notes = $"Payment against invoice {sale.InvoiceNumber}"
        });

        await _db.SaveChangesAsync();
        return Ok(sale);
    }

    [HttpPost("{id}/cancel")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Cancel(int id)
    {
        var sale = await _db.VehicleSales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id);
        if (sale is null) return NotFound();

        var trip = await _db.Trips.FindAsync(sale.TripId);
        if (trip is not null && trip.Status != TripStatus.Open)
            return BadRequest("Cannot cancel a sale from a closed trip.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // Restock the vehicle (not the godown - goods never left the vehicle for this trip)
            foreach (var item in sale.Items)
            {
                var vehicleStock = await _db.VehicleStocks
                    .FirstOrDefaultAsync(vs => vs.VehicleId == sale.VehicleId && vs.ProductId == item.ProductId);
                if (vehicleStock is not null) vehicleStock.QuantityUnits += item.QuantityUnits;
            }

            var shop = await _db.Shops.FindAsync(sale.ShopId);
            if (shop is not null)
            {
                shop.OutstandingBalance -= (sale.TotalAmount - sale.AmountPaid);
                _db.ShopLedgerEntries.Add(new ShopLedgerEntry
                {
                    ShopId = shop.Id,
                    VehicleSaleId = sale.Id,
                    Type = LedgerEntryType.Payment,
                    Credit = sale.TotalAmount - sale.AmountPaid,
                    RunningBalance = shop.OutstandingBalance,
                    Notes = $"Cancelled invoice {sale.InvoiceNumber}"
                });
            }

            _db.VehicleSaleItems.RemoveRange(sale.Items);
            _db.VehicleSales.Remove(sale);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var today = DateTime.UtcNow;
        var prefix = $"INV-{today:yyyyMMdd}-";
        var countToday = await _db.VehicleSales.CountAsync(s => s.InvoiceNumber.StartsWith(prefix));
        return $"{prefix}{(countToday + 1):D4}";
    }
}
