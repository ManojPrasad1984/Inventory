using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryBilling.Api.Data;
using InventoryBilling.Api.DTOs;
using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    public InvoicesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Invoice>>> GetAll(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] PaymentStatus? status)
    {
        var query = _db.Invoices.Include(i => i.Customer).AsQueryable();

        if (from.HasValue) query = query.Where(i => i.InvoiceDate >= from.Value);
        if (to.HasValue) query = query.Where(i => i.InvoiceDate <= to.Value);
        if (status.HasValue) query = query.Where(i => i.PaymentStatus == status.Value);

        var invoices = await query.OrderByDescending(i => i.InvoiceDate).ToListAsync();
        return Ok(invoices);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Invoice>> GetById(int id)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Items)
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null) return NotFound();
        return Ok(invoice);
    }

    [HttpPost]
    public async Task<ActionResult<Invoice>> Create(InvoiceCreateRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest("An invoice needs at least one line item.");

        // Use a transaction so stock deduction and invoice creation succeed or fail together
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var invoice = new Invoice
            {
                InvoiceNumber = await GenerateInvoiceNumberAsync(),
                CustomerId = request.CustomerId,
                WalkInCustomerName = request.WalkInCustomerName,
                DiscountAmount = request.DiscountAmount,
                PaymentMethod = request.PaymentMethod,
                Notes = request.Notes
            };

            decimal subTotal = 0;
            decimal taxTotal = 0;

            foreach (var line in request.Items)
            {
                var product = await _db.Products.FindAsync(line.ProductId);
                if (product is null)
                    return BadRequest($"Product {line.ProductId} not found.");
                if (line.Quantity <= 0)
                    return BadRequest($"Quantity for '{product.Name}' must be greater than zero.");
                if (product.StockQuantity < line.Quantity)
                    return BadRequest($"Insufficient stock for '{product.Name}'. Available: {product.StockQuantity}, requested: {line.Quantity}.");

                var lineSubTotal = product.SellingPrice * line.Quantity;
                var lineTax = lineSubTotal * (product.TaxPercent / 100m);

                invoice.Items.Add(new InvoiceItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Quantity = line.Quantity,
                    UnitPrice = product.SellingPrice,
                    TaxPercent = product.TaxPercent,
                    LineTotal = lineSubTotal + lineTax
                });

                subTotal += lineSubTotal;
                taxTotal += lineTax;

                // Deduct stock immediately as part of the same transaction
                product.StockQuantity -= line.Quantity;
                product.UpdatedAt = DateTime.UtcNow;
            }

            invoice.SubTotal = subTotal;
            invoice.TaxAmount = taxTotal;
            invoice.TotalAmount = subTotal + taxTotal - request.DiscountAmount;
            invoice.AmountPaid = request.AmountPaid;

            invoice.PaymentStatus =
                request.AmountPaid >= invoice.TotalAmount ? PaymentStatus.Paid :
                request.AmountPaid <= 0 ? PaymentStatus.Unpaid :
                PaymentStatus.Partial;

            // Track outstanding balance for registered customers on partial/unpaid invoices
            if (request.CustomerId.HasValue && invoice.PaymentStatus != PaymentStatus.Paid)
            {
                var customer = await _db.Customers.FindAsync(request.CustomerId.Value);
                if (customer is not null)
                {
                    customer.OutstandingBalance += invoice.TotalAmount - invoice.AmountPaid;
                }
            }

            _db.Invoices.Add(invoice);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = invoice.Id }, invoice);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // Record an additional payment against a partially-paid invoice
    [HttpPost("{id}/record-payment")]
    public async Task<IActionResult> RecordPayment(int id, [FromBody] decimal amount)
    {
        var invoice = await _db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();
        if (amount <= 0) return BadRequest("Payment amount must be positive.");

        invoice.AmountPaid += amount;
        if (invoice.AmountPaid >= invoice.TotalAmount)
        {
            invoice.AmountPaid = invoice.TotalAmount;
            invoice.PaymentStatus = PaymentStatus.Paid;
        }
        else
        {
            invoice.PaymentStatus = PaymentStatus.Partial;
        }

        if (invoice.CustomerId.HasValue)
        {
            var customer = await _db.Customers.FindAsync(invoice.CustomerId.Value);
            if (customer is not null)
                customer.OutstandingBalance = Math.Max(0, customer.OutstandingBalance - amount);
        }

        await _db.SaveChangesAsync();
        return Ok(invoice);
    }

    [HttpPost("{id}/cancel")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Cancel(int id)
    {
        var invoice = await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return NotFound();

        // Restock items on cancellation
        foreach (var item in invoice.Items)
        {
            var product = await _db.Products.FindAsync(item.ProductId);
            if (product is not null)
                product.StockQuantity += item.Quantity;
        }

        _db.InvoiceItems.RemoveRange(invoice.Items);
        _db.Invoices.Remove(invoice);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var today = DateTime.UtcNow;
        var prefix = $"INV-{today:yyyyMMdd}-";
        var countToday = await _db.Invoices.CountAsync(i => i.InvoiceNumber.StartsWith(prefix));
        return $"{prefix}{(countToday + 1):D4}";
    }
}
