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
public class ShopsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ShopsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Shop>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Shops.Where(s => s.IsActive).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.Name.Contains(search) || (s.Phone != null && s.Phone.Contains(search)));

        return Ok(await query.OrderBy(s => s.Name).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Shop>> GetById(int id)
    {
        var shop = await _db.Shops.FindAsync(id);
        if (shop is null) return NotFound();
        return Ok(shop);
    }

    // Full statement: every sale and payment that moved this shop's balance, in order.
    [HttpGet("{id}/ledger")]
    public async Task<ActionResult<IEnumerable<ShopLedgerEntry>>> GetLedger(int id)
    {
        var entries = await _db.ShopLedgerEntries
            .Where(l => l.ShopId == id)
            .OrderBy(l => l.EntryDate)
            .ThenBy(l => l.Id)
            .ToListAsync();
        return Ok(entries);
    }

    [HttpGet("{id}/sales")]
    public async Task<ActionResult<IEnumerable<VehicleSale>>> GetSales(int id)
    {
        var sales = await _db.VehicleSales
            .Include(s => s.Vehicle)
            .Where(s => s.ShopId == id)
            .OrderByDescending(s => s.SaleDate)
            .ToListAsync();
        return Ok(sales);
    }

    [HttpPost]
    public async Task<ActionResult<Shop>> Create(ShopUpsertRequest request)
    {
        var shop = new Shop
        {
            Name = request.Name,
            Phone = request.Phone,
            Address = request.Address,
            GstNumber = request.GstNumber,
            CreditLimit = request.CreditLimit
        };
        _db.Shops.Add(shop);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = shop.Id }, shop);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ShopUpsertRequest request)
    {
        var shop = await _db.Shops.FindAsync(id);
        if (shop is null) return NotFound();

        shop.Name = request.Name;
        shop.Phone = request.Phone;
        shop.Address = request.Address;
        shop.GstNumber = request.GstNumber;
        shop.CreditLimit = request.CreditLimit;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Record a payment collected from the shop against its running credit balance (not tied to one specific sale).
    [HttpPost("{id}/payments")]
    public async Task<IActionResult> RecordPayment(int id, ShopPaymentRequest request)
    {
        if (request.Amount <= 0) return BadRequest("Payment amount must be positive.");

        var shop = await _db.Shops.FindAsync(id);
        if (shop is null) return NotFound();

        shop.OutstandingBalance -= request.Amount;

        _db.ShopLedgerEntries.Add(new ShopLedgerEntry
        {
            ShopId = shop.Id,
            Type = LedgerEntryType.Payment,
            Credit = request.Amount,
            RunningBalance = shop.OutstandingBalance,
            Notes = request.Notes
        });

        await _db.SaveChangesAsync();
        return Ok(shop);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var shop = await _db.Shops.FindAsync(id);
        if (shop is null) return NotFound();

        var hasSales = await _db.VehicleSales.AnyAsync(s => s.ShopId == id);
        if (hasSales)
        {
            shop.IsActive = false; // keep history, just hide it from pick-lists
            await _db.SaveChangesAsync();
            return NoContent();
        }

        _db.Shops.Remove(shop);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
