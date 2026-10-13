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
    public async Task<ActionResult<IEnumerable<Product>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? brandCategory, [FromQuery] bool lowStockOnly = false)
    {
        var query = _db.Products.Where(p => p.IsActive).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Sku != null && p.Sku.Contains(search)));

        if (!string.IsNullOrWhiteSpace(brandCategory))
            query = query.Where(p => p.BrandCategory == brandCategory);

        if (lowStockOnly)
            query = query.Where(p => p.GodownStockUnits <= p.LowStockThresholdUnits);

        var items = await query.OrderBy(p => p.BrandCategory).ThenBy(p => p.Name).ToListAsync();
        return Ok(items);
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<string>>> GetCategories()
    {
        var categories = await _db.Products
            .Where(p => p.IsActive && p.BrandCategory != null)
            .Select(p => p.BrandCategory!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
        return Ok(categories);
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
        if (request.UnitsPerCase <= 0) return BadRequest("Units per case must be at least 1.");

        var product = new Product
        {
            Name = request.Name,
            Sku = request.Sku,
            BrandCategory = request.BrandCategory,
            PackSize = request.PackSize,
            UnitsPerCase = request.UnitsPerCase,
            MrpPerUnit = request.MrpPerUnit,
            PurchasePricePerCase = request.PurchasePricePerCase,
            SellingPricePerCase = request.SellingPricePerCase,
            TaxPercent = request.TaxPercent,
            GodownStockUnits = request.GodownStockUnits,
            LowStockThresholdUnits = request.LowStockThresholdUnits
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
        if (request.UnitsPerCase <= 0) return BadRequest("Units per case must be at least 1.");

        product.Name = request.Name;
        product.Sku = request.Sku;
        product.BrandCategory = request.BrandCategory;
        product.PackSize = request.PackSize;
        product.UnitsPerCase = request.UnitsPerCase;
        product.MrpPerUnit = request.MrpPerUnit;
        product.PurchasePricePerCase = request.PurchasePricePerCase;
        product.SellingPricePerCase = request.SellingPricePerCase;
        product.TaxPercent = request.TaxPercent;
        product.GodownStockUnits = request.GodownStockUnits;
        product.LowStockThresholdUnits = request.LowStockThresholdUnits;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Manual correction only (breakage, physical count fix) - everyday stock movement happens via Purchases/Trips.
    [HttpPost("{id}/adjust-stock")]
    public async Task<IActionResult> AdjustStock(int id, StockAdjustRequest request)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        var newQty = product.GodownStockUnits + request.DeltaUnits;
        if (newQty < 0) return BadRequest("Godown stock cannot go below zero.");

        product.GodownStockUnits = newQty;
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

        // Soft delete so historical purchases/sales still resolve correctly
        product.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
