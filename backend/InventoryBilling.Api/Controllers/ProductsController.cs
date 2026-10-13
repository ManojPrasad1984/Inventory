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
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProductsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll([FromQuery] string? search, [FromQuery] bool lowStockOnly = false)
    {
        var query = _db.Products.Where(p => p.IsActive).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Sku != null && p.Sku.Contains(search)));

        if (lowStockOnly)
            query = query.Where(p => p.StockQuantity <= p.LowStockThreshold);

        var items = await query.OrderBy(p => p.Name).ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();
        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create(ProductUpsertRequest request)
    {
        var product = new Product
        {
            Name = request.Name,
            Sku = request.Sku,
            Description = request.Description,
            Category = request.Category,
            Unit = string.IsNullOrWhiteSpace(request.Unit) ? "pcs" : request.Unit,
            PurchasePrice = request.PurchasePrice,
            SellingPrice = request.SellingPrice,
            TaxPercent = request.TaxPercent,
            StockQuantity = request.StockQuantity,
            LowStockThreshold = request.LowStockThreshold
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ProductUpsertRequest request)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.Name = request.Name;
        product.Sku = request.Sku;
        product.Description = request.Description;
        product.Category = request.Category;
        product.Unit = request.Unit;
        product.PurchasePrice = request.PurchasePrice;
        product.SellingPrice = request.SellingPrice;
        product.TaxPercent = request.TaxPercent;
        product.StockQuantity = request.StockQuantity;
        product.LowStockThreshold = request.LowStockThreshold;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Adjust stock without a full update - useful for "received new stock" or corrections
    [HttpPost("{id}/adjust-stock")]
    public async Task<IActionResult> AdjustStock(int id, StockAdjustRequest request)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        var newQty = product.StockQuantity + request.Delta;
        if (newQty < 0) return BadRequest("Stock cannot go below zero.");

        product.StockQuantity = newQty;
        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(product);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        // Soft delete so historical invoices still resolve correctly
        product.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
