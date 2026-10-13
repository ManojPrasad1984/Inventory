using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryBilling.Api.Data;
using InventoryBilling.Api.DTOs;
using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.Controllers;

/// <summary>Workflow step 1: stock received from a supplier (e.g. "Superior") against an invoice, adds to godown stock.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchasesController : ControllerBase
{
    private readonly AppDbContext _db;
    public PurchasesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Purchase>>> GetAll([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = _db.Purchases.Include(p => p.Supplier).AsQueryable();
        if (from.HasValue) query = query.Where(p => p.InvoiceDate >= from.Value);
        if (to.HasValue) query = query.Where(p => p.InvoiceDate <= to.Value);

        return Ok(await query.OrderByDescending(p => p.InvoiceDate).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Purchase>> GetById(int id)
    {
        var purchase = await _db.Purchases
            .Include(p => p.Items)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (purchase is null) return NotFound();
        return Ok(purchase);
    }

    [HttpPost]
    public async Task<ActionResult<Purchase>> Create(PurchaseCreateRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest("A purchase needs at least one line item.");

        var supplier = await _db.Suppliers.FindAsync(request.SupplierId);
        if (supplier is null) return BadRequest("Supplier not found.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var purchase = new Purchase
            {
                PurchaseNumber = await GeneratePurchaseNumberAsync(),
                SupplierId = request.SupplierId,
                SupplierInvoiceNumber = request.SupplierInvoiceNumber,
                InvoiceDate = request.InvoiceDate ?? DateTime.UtcNow,
                PaymentMode = request.PaymentMode,
                Notes = request.Notes
            };

            decimal total = 0;

            foreach (var line in request.Items)
            {
                var product = await _db.Products.FindAsync(line.ProductId);
                if (product is null) return BadRequest($"Product {line.ProductId} not found.");
                if (line.QuantityCases <= 0) return BadRequest($"Quantity for '{product.Name}' must be greater than zero.");

                var quantityUnits = line.QuantityCases * product.UnitsPerCase;
                var lineTotal = line.UnitCostPerCase * line.QuantityCases;

                purchase.Items.Add(new PurchaseItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    QuantityCases = line.QuantityCases,
                    QuantityUnits = quantityUnits,
                    UnitCostPerCase = line.UnitCostPerCase,
                    LineTotal = lineTotal
                });

                total += lineTotal;

                // Stock lands in the godown immediately
                product.GodownStockUnits += quantityUnits;
                product.PurchasePricePerCase = line.UnitCostPerCase; // keep latest cost for reference
                product.UpdatedAt = DateTime.UtcNow;
            }

            purchase.TotalAmount = total;
            purchase.AmountPaid = request.AmountPaid;

            _db.Purchases.Add(purchase);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = purchase.Id }, purchase);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var purchase = await _db.Purchases.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
        if (purchase is null) return NotFound();

        // Reverse the stock this purchase added, since godown stock may already have moved on via a Trip otherwise
        foreach (var item in purchase.Items)
        {
            var product = await _db.Products.FindAsync(item.ProductId);
            if (product is not null)
            {
                if (product.GodownStockUnits < item.QuantityUnits)
                    return BadRequest($"Cannot delete: '{item.ProductName}' stock has already moved (godown balance is lower than this purchase's quantity).");
                product.GodownStockUnits -= item.QuantityUnits;
            }
        }

        _db.PurchaseItems.RemoveRange(purchase.Items);
        _db.Purchases.Remove(purchase);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> GeneratePurchaseNumberAsync()
    {
        var today = DateTime.UtcNow;
        var prefix = $"GRN-{today:yyyyMMdd}-";
        var countToday = await _db.Purchases.CountAsync(p => p.PurchaseNumber.StartsWith(prefix));
        return $"{prefix}{(countToday + 1):D4}";
    }
}
