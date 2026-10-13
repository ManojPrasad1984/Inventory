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
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _db;
    public SuppliersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Supplier>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Suppliers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.Name.Contains(search));
        return Ok(await query.OrderBy(s => s.Name).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Supplier>> GetById(int id)
    {
        var supplier = await _db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound();
        return Ok(supplier);
    }

    [HttpPost]
    public async Task<ActionResult<Supplier>> Create(SupplierUpsertRequest request)
    {
        var supplier = new Supplier
        {
            Name = request.Name,
            Phone = request.Phone,
            Address = request.Address,
            GstNumber = request.GstNumber
        };
        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, SupplierUpsertRequest request)
    {
        var supplier = await _db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound();

        supplier.Name = request.Name;
        supplier.Phone = request.Phone;
        supplier.Address = request.Address;
        supplier.GstNumber = request.GstNumber;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound();

        var hasPurchases = await _db.Purchases.AnyAsync(p => p.SupplierId == id);
        if (hasPurchases) return BadRequest("Cannot delete a supplier with existing purchases.");

        _db.Suppliers.Remove(supplier);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
